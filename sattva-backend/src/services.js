const axios = require("axios"),
  Anthropic = require("@anthropic-ai/sdk"),
  OpenAI = require("openai"),
  cheerio = require("cheerio");
const { unavailable } = require("./utils");
const model = {
  provider: "huggingface",
  name: "dima806/deepfake_vs_real_image_detection",
};
async function analyzeMedia(fileUrl) {
  if (!process.env.HF_TOKEN || !fileUrl)
    return {
      ...unavailable(!fileUrl ? "MEDIA_UNAVAILABLE" : "HF_NOT_CONFIGURED"),
      model,
      score: null,
    };
  try {
    const image = await axios.get(fileUrl, {
      responseType: "arraybuffer",
      timeout: 20000,
    });
    const res = await axios.post(
      "https://router.huggingface.co/hf-inference/models/dima806/deepfake_vs_real_image_detection",
      image.data,
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/octet-stream",
        },
        timeout: 30000,
      },
    );
    const labels = Array.isArray(res.data) ? res.data : [];
    const fake = labels.find((x) => String(x.label).toLowerCase() === "fake");
    if (!fake)
      return {
        ...unavailable("FORENSIC_RESPONSE_INVALID"),
        model,
        score: null,
      };
    return {
      available: true,
      score: Math.round((1 - fake.score) * 100),
      confidence: fake.score,
      model,
      indicators: [
        {
          name: "frame_level_fake_signal",
          severity: fake.score > 0.7 ? "high" : "medium",
          confidence: fake.score,
        },
      ],
      framesAnalyzed: 1,
    };
  } catch {
    return { ...unavailable("FORENSIC_UNAVAILABLE"), model, score: null };
  }
}
async function generateEmbedding(text) {
  if (!process.env.OPENAI_API_KEY)
    throw Object.assign(
      new Error("OPENAI_API_KEY is required for embeddings"),
      { code: "EMBEDDINGS_NOT_CONFIGURED" },
    );
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const r = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return r.data[0].embedding;
}
async function extractUrl(url) {
  try {
    const r = await axios.get(url, {
      timeout: 15000,
      headers: { "User-Agent": "SattvaResearchBot/1.0" },
      maxContentLength: 2_000_000,
    });
    const $ = cheerio.load(r.data);
    const content = $("article").text() || $("main").text() || $("body").text();
    return {
      available: true,
      title:
        $('meta[property="og:title"]').attr("content") ||
        $("title").text() ||
        null,
      publisher:
        $('meta[property="og:site_name"]').attr("content") ||
        new URL(url).hostname,
      publishedAt:
        $('meta[property="article:published_time"]').attr("content") || null,
      content: content.replace(/\s+/g, " ").trim().slice(0, 30000),
      url,
    };
  } catch {
    return unavailable("PAGE_FETCH_FAILED");
  }
}
async function synthesize({ claim, evidence, sources, score }) {
  if (!process.env.CLAUDE_API_KEY)
    return {
      summary:
        "AI synthesis unavailable. Review the evidence trail and source corroboration below.",
      reasoning: ["The report uses the available evidence signals only."],
      evidenceTrail: evidence,
    };
  try {
    const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
    const prompt = `Return JSON only with summary, reasoning (brief evidence-grounded bullets), evidenceTrail. Do not invent sources, metadata, or results. Claim: ${claim}. Score: ${JSON.stringify(score)}. Evidence: ${JSON.stringify(evidence)}. Sources: ${JSON.stringify(sources.map((s) => ({ title: s.title, url: s.url, publisher: s.publisher })))}`;
    const r = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });
    return JSON.parse(r.content[0].text.replace(/^```json|```$/g, ""));
  } catch {
    return {
      summary:
        "Synthesis could not be completed. The available evidence is shown below.",
      reasoning: ["Evidence synthesis unavailable."],
      evidenceTrail: evidence,
    };
  }
}
module.exports = {
  analyzeMedia,
  generateEmbedding,
  extractUrl,
  synthesize,
  model,
};
