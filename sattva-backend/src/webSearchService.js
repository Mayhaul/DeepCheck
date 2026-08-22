const axios = require("axios");

function configured() {
  return Boolean(process.env.TAVILY_API_KEY);
}

async function tavilySearch(query, { maxResults = 8, topic = "general" } = {}) {
  if (!configured()) {
    return {
      available: false,
      reason: "TAVILY_NOT_CONFIGURED",
      results: [],
    };
  }

  try {
    const response = await axios.post(
      "https://api.tavily.com/search",
      {
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "advanced",
        topic,
        max_results: maxResults,
        include_answer: false,
        include_raw_content: false,
      },
      {
        timeout: 20000,
        headers: { "Content-Type": "application/json" },
      },
    );

    return {
      available: true,
      results: (response.data?.results || [])
        .map((item) => ({
          title: item.title || "Untitled result",
          url: item.url,
          description: item.content || "",
          publisher: publisherFrom(item.url),
          publishedAt: item.published_date || null,
          relevance: Number.isFinite(item.score)
            ? Math.round(item.score * 100)
            : null,
        }))
        .filter((item) => item.url),
    };
  } catch {
    return {
      available: false,
      reason: "TAVILY_SEARCH_FAILED",
      results: [],
    };
  }
}

async function searchClaim(claim) {
  const [web, news] = await Promise.all([
    tavilySearch(claim, { maxResults: 6, topic: "general" }),
    tavilySearch(`${claim} latest news`, { maxResults: 6, topic: "news" }),
  ]);

  const results = dedupe([
    ...(web.results || []),
    ...(news.results || []),
  ]).slice(0, 10);

  return {
    available: web.available || news.available,
    results,
    reason: web.reason || news.reason,
  };
}

async function searchSourceHistory(publisher) {
  if (!publisher) {
    return {
      available: false,
      reason: "SOURCE_UNKNOWN",
      results: [],
      signals: {},
    };
  }

  const queries = [
    `"${publisher}" fact check false claim misinformation`,
    `"${publisher}" fake news correction retraction`,
  ];

  const responses = await Promise.all(
    queries.map((query) => tavilySearch(query, { maxResults: 6 })),
  );

  const results = dedupe(
    responses.flatMap((response) => response.results || []),
  ).slice(0, 12);

  const negative = results.filter((result) =>
    /fake|false|misinformation|hoax|debunk|retract|correction|fabricat/i.test(
      `${result.title} ${result.description}`,
    ),
  );

  const positive = results.filter((result) =>
    /fact check|corroborat|correction|transparent|accurate/i.test(
      `${result.title} ${result.description}`,
    ),
  );

  const score = results.length
    ? Math.max(0, Math.min(100, 70 - negative.length * 8 + positive.length * 3))
    : null;

  return {
    available: responses.some((response) => response.available),
    results,
    signals: {
      negativeReports: negative.length,
      positiveSignals: positive.length,
      historyScore: score,
    },
  };
}

function publisherFrom(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Unknown source";
  }
}

function dedupe(results) {
  const seen = new Set();
  return results.filter((result) => {
    if (!result.url || seen.has(result.url)) return false;
    seen.add(result.url);
    return true;
  });
}

module.exports = { tavilySearch, searchClaim, searchSourceHistory };
