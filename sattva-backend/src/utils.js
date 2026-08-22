const VALID_TYPES = ["image", "video", "audio", "text", "article_url", "document"];

function calculateCredibility({ claimCredibility, sourceCredibility, evidenceAgreement, forensic, provenance }) {
  const claim = Number.isFinite(claimCredibility) ? claimCredibility : 50;
  const source = Number.isFinite(sourceCredibility) ? sourceCredibility : 50;
  const agreement = Number.isFinite(evidenceAgreement) ? evidenceAgreement : 50;
  const media = Number.isFinite(forensic) ? forensic : null;
  const proof = Number.isFinite(provenance) ? provenance : null;
  const credibilityScore = Math.round(claim * 0.55 + source * 0.2 + agreement * 0.25);
  const available = [claimCredibility, sourceCredibility, evidenceAgreement, media, proof].filter(Number.isFinite);
  const confidenceLevel = available.length >= 3 ? "HIGH" : available.length === 2 ? "MEDIUM" : "LOW";
  return { credibilityScore, confidenceLevel };
}

const unavailable = (reason) => ({ available: false, reason });

module.exports = { VALID_TYPES, calculateCredibility, unavailable };
