const axios = require("axios");

function configured() {
  return Boolean(process.env.BRAVE_SEARCH_API_KEY);
}

async function braveSearch(query, { count = 8, news = false } = {}) {
  if (!configured()) return { available: false, reason: "BRAVE_NOT_CONFIGURED", results: [] };
  try {
    const endpoint = news
      ? "https://api.search.brave.com/res/v1/news/search"
      : "https://api.search.brave.com/res/v1/web/search";
    const response = await axios.get(endpoint, {
      params: { q: query, count, search_lang: "en", country: "IN", safesearch: "moderate" },
      headers: { "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY, Accept: "application/json" },
      timeout: 15000,
    });
    const items = response.data?.web?.results || response.data?.results || [];
    return {
      available: true,
      results: items.map((item) => ({
        title: item.title || "Untitled result",
        url: item.url,
        description: item.description || item.snippet || "",
        publisher: publisherFrom(item.url),
        publishedAt: item.age || item.meta_url?.favicon || null,
      })).filter((item) => item.url),
    };
  } catch {
    return { available: false, reason: "BRAVE_SEARCH_FAILED", results: [] };
  }
}

async function searchClaim(claim) {
  const [web, news] = await Promise.all([
    braveSearch(claim, { count: 6 }),
    braveSearch(claim, { count: 6, news: true }),
  ]);
  const merged = [...(web.results || []), ...(news.results || [])];
  return { available: web.available || news.available, results: dedupe(merged).slice(0, 10), reason: web.reason || news.reason };
}

async function searchSourceHistory(publisher) {
  if (!publisher) return { available: false, reason: "SOURCE_UNKNOWN", results: [], signals: [] };
  const queries = [
    `"${publisher}" fact check false claim misinformation`,
    `"${publisher}" fake news correction retraction`,
  ];
  const responses = await Promise.all(queries.map((q) => braveSearch(q, { count: 6 })));
  const results = dedupe(responses.flatMap((r) => r.results || [])).slice(0, 12);
  const negative = results.filter((r) => /fake|false|misinformation|hoax|debunk|retract|correction|fabricat/i.test(`${r.title} ${r.description}`));
  const positive = results.filter((r) => /fact check|corroborat|correction|transparent|accurate/i.test(`${r.title} ${r.description}`));
  const score = results.length ? Math.max(0, Math.min(100, 70 - negative.length * 8 + positive.length * 3)) : null;
  return {
    available: responses.some((r) => r.available),
    results,
    signals: { negativeReports: negative.length, positiveSignals: positive.length, historyScore: score },
  };
}

function publisherFrom(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "Unknown source"; }
}

function dedupe(results) {
  const seen = new Set();
  return results.filter((r) => { if (!r.url || seen.has(r.url)) return false; seen.add(r.url); return true; });
}

module.exports = { braveSearch, searchClaim, searchSourceHistory };
