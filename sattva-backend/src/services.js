const axios = require("axios");
const { GoogleGenAI } = require("@google/genai");
const cheerio = require("cheerio");
const { unavailable } = require("./utils");

const forensicModel = {
  provider: "huggingface",
  name: "dima806/deepfake_vs_real_image_detection",
};

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw Object.assign(new Error("GEMINI_API_KEY is required"), {
      code: "GEMINI_NOT_CONFIGURED",
    });
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

async function analyzeMedia(fileUrl) {
  if (!process.env.HF_TOKEN || !fileUrl) {
    return {
      ...unavailable(!fileUrl ? "MEDIA_UNAVAILABLE" : "HF_NOT_CONFIGURED"),
      model: forensicModel,
      score: null,
    };
  }

  try {
    const image = await axios.get(fileUrl, {
      responseType: "arraybuffer",
      timeout: 20000,
    });
    const response = await axios.post(
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
    const labels = Array.isArray(response.data) ? response.data : [];
    const fake = labels.find(
      (item) => String(item.label).toLowerCase() === "fake",
    );
    if (!fake) {
      return {
        ...unavailable("FORENSIC_RESPONSE_INVALID"),
        model: forensicModel,
        score: null,
      };
    }
    return {
      available: true,
      score: Math.round((1 - fake.score) * 100),
      confidence: fake.score,
      model: forensicModel,
      indicators: [
        {
          name: "frame_level_fake_signal",
          severity: fake.score > 0.7 ? "high" : "medium",
          confidence: fake.score,
        },
      ],
      framesAnalyzed: 1,
    };
  } catch (error) {
    console.error("Forensic analysis failed:", error.message);
    return {
      ...unavailable("FORENSIC_UNAVAILABLE"),
      model: forensicModel,
      score: null,
    };
  }
}

async function generateEmbedding(text) {
  const ai = getGeminiClient();
  const result = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents: text,
    config: { outputDimensionality: 1536 },
  });

  const embedding = result.embeddings?.[0]?.values;
  if (!Array.isArray(embedding)) {
    throw Object.assign(new Error("Gemini embedding response was invalid"), {
      code: "EMBEDDINGS_INVALID",
    });
  }
  return embedding;
}

async function extractUrl(url) {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: { "User-Agent": "DeepCheckResearchBot/1.0" },
      maxContentLength: 2000000,
    });
    const $ = cheerio.load(response.data);
    const content = $("article").text() || $("main").text() || $("body").text();
    return {
      available: true,
      title:
        $("meta[property=\"og:title\"]").attr("content") ||
        $("title").text() ||
        null,
      publisher:
        $("meta[property=\"og:site_name\"]").attr("content") ||
        new URL(url).hostname,
      publishedAt:
        $("meta[property=\"article:published_time\"]").attr("content") ||
        null,
      content: content.replace(/\s+/g, " ").trim().slice(0, 30000),
      url,
    };
  } catch (error) {
    console.error("URL extraction failed:", error.message);
    return unavailable("PAGE_FETCH_FAILED");
  }
}

async function synthesize({
  claim,
  uploadedDocument,
  webEvidence,
  sourceProfile,
  knowledgeBase,
  forensic,
  transcript,
  pageEvidence,
}) {
  try {
    const ai = getGeminiClient();
    const prompt = `You are DeepCheck, an evidence-analysis system. Assess the claim using ONLY the supplied evidence. Do not invent facts, sources, history, or certainty. Keep claim credibility separate from source credibility. A source having a poor history does NOT prove the current claim false. Return JSON only.

CLAIM:
${claim}

UPLOADED DOCUMENT RAG:
${JSON.stringify(uploadedDocument)}

LIVE WEB SEARCH:
${JSON.stringify(webEvidence)}

SOURCE CREDIBILITY HISTORY:
${JSON.stringify(sourceProfile)}

CURATED KNOWLEDGE BASE:
${JSON.stringify(knowledgeBase)}

ARTICLE EVIDENCE:
${JSON.stringify(pageEvidence)}

FORENSIC SIGNAL:
${JSON.stringify(forensic)}

TRANSCRIPT:
${JSON.stringify(transcript)}

Return verdict, claimCredibility (0-100), evidenceAgreement (0-100), summary, reasoning (array), evidenceTrail (array). Verdict must be SUPPORTED, LIKELY_FALSE, MIXED, or INSUFFICIENT_EVIDENCE.`;

    const result = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            verdict: { type: "string" },
            claimCredibility: { type: "number" },
            evidenceAgreement: { type: "number" },
            summary: { type: "string" },
            reasoning: { type: "array", items: { type: "string" } },
            evidenceTrail: { type: "array", items: { type: "object" } },
          },
          required: [
            "verdict",
            "claimCredibility",
            "evidenceAgreement",
            "summary",
            "reasoning",
            "evidenceTrail",
          ],
        },
      },
    });

    if (!result?.text) {
      throw new Error("Gemini returned an empty synthesis response");
    }

    return JSON.parse(result.text);
  } catch (error) {
    console.error("Gemini synthesis failed:", {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status,
      response: error.response?.data,
    });

    return {
      verdict: "INSUFFICIENT_EVIDENCE",
      claimCredibility: null,
      evidenceAgreement: null,
      summary:
        "Evidence synthesis could not be completed. The available evidence is shown without a definitive conclusion.",
      reasoning: [
        "Gemini synthesis was unavailable. Check the backend logs for the underlying API error.",
      ],
      evidenceTrail: [],
    };
  }
}

module.exports = {
  analyzeMedia,
  generateEmbedding,
  extractUrl,
  synthesize,
  forensicModel,
};
