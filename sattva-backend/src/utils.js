const VALID_TYPES = ["image", "video", "audio", "text", "article_url"];
function calculateScore({ forensic, provenance, corroboration }) {
  const vals = [forensic, provenance, corroboration].filter(Number.isFinite);
  if (vals.length < 2)
    return {
      trustScore: null,
      confidenceLevel: "LOW",
      verdict: "NOT_CONFIDENT_ENOUGH_TO_CALL",
    };
  const score = Math.round(
    (forensic ?? 50) * 0.4 +
      (provenance ?? 50) * 0.2 +
      (corroboration ?? 50) * 0.4,
  );
  const spread = Math.max(...vals) - Math.min(...vals);
  const confidence = spread > 40 ? "LOW" : spread > 25 ? "MEDIUM" : "HIGH";
  let verdict =
    score >= 65
      ? "LIKELY_AUTHENTIC"
      : score <= 35
        ? "LIKELY_MANIPULATED"
        : "UNCERTAIN";
  if (confidence === "LOW") verdict = "NOT_CONFIDENT_ENOUGH_TO_CALL";
  return { trustScore: score, confidenceLevel: confidence, verdict };
}
const unavailable = (reason) => ({ available: false, reason });
module.exports = { VALID_TYPES, calculateScore, unavailable };
