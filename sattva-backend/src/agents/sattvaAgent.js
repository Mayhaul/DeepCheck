const { Submission, Analysis, Report } = require("../models");
const { synthesize } = require("../services");
const { searchSources } = require("../ragService");
const { extractDocumentText, indexDocument, searchDocument } = require("../documentService");
const { searchClaim, searchSourceHistory } = require("../webSearchService");
const { assessSourceCredibility } = require("../sourceCredibilityService");
const { calculateCredibility } = require("../utils");

async function update(submission, stage, progress, message) {
  Object.assign(submission, { status: "processing", currentStage: stage, progress, message });
  await submission.save();
}

async function runInvestigation(id, { demoCase } = {}) {
  const submission = await Submission.findById(id);
  if (!submission) throw Object.assign(new Error("SUBMISSION_NOT_FOUND"), { status: 404 });

  if (process.env.DEMO_MODE === "true") {
    const report = await Report.findOneAndUpdate(
      { submissionId: submission._id },
      {
        submissionId: submission._id,
        summary: "Demo mode is enabled. No live evidence was collected.",
        verdict: demoCase === "false" ? "LIKELY_FALSE" : "SUPPORTED",
        credibilityScore: demoCase === "false" ? 32 : 82,
        confidenceLevel: "HIGH",
        scores: { claimCredibility: demoCase === "false" ? 25 : 88, sourceCredibility: 70, evidenceAgreement: 80 },
        evidenceTrail: [{ type: "demo", description: "Controlled demonstration result.", confidence: 0, relationship: "neutral" }],
        uploadedDocument: { available: false, reason: "DEMO_MODE" },
        webEvidence: { available: false, reason: "DEMO_MODE", results: [] },
        sourceProfile: { available: false, reason: "DEMO_MODE" },
        reasoning: ["Demo mode is enabled."],
        isDemo: true,
      },
      { upsert: true, new: true },
    );
    Object.assign(submission, { status: "completed", currentStage: "completed", progress: 100, message: "Demo report generated." });
    await submission.save();
    return report;
  }

  await update(submission, "claim_analysis", 10, "Understanding the submitted claim.");
  const claim = submission.claim.trim();

  let uploadedDocument = { available: false, reason: "NOT_PROVIDED" };
  if (submission.type === "document") {
    await update(submission, "document_rag", 25, "Reading and indexing the uploaded document.");
    const extracted = await extractDocumentText(submission.fileUrl, submission.fileMeta?.mimeType);
    if (extracted.available) {
      const indexed = await indexDocument(submission._id, extracted.text);
      const retrieved = await searchDocument(submission._id, claim);
      uploadedDocument = { ...extracted, indexedChunks: indexed.chunks, retrievedChunks: retrieved.chunks };
    } else {
      uploadedDocument = extracted;
    }
  }

  await update(submission, "web_search", 45, "Searching independent web and news evidence.");
  const webEvidence = await searchClaim(claim);

  await update(submission, "source_credibility", 58, "Checking the source's public history.");
  const publisher = submission.sourceName || webEvidence.results?.[0]?.publisher || null;
  const sourceHistory = await searchSourceHistory(publisher);
  const sourceProfile = assessSourceCredibility(sourceHistory, publisher);

  await update(submission, "knowledge_base", 68, "Checking the curated knowledge base.");
  const knowledgeBase = await searchSources(claim);

  await update(submission, "evidence_synthesis", 82, "Comparing document, web, and knowledge-base evidence.");
  const synthesis = await synthesize({ claim, uploadedDocument, webEvidence, sourceProfile, knowledgeBase });

  const scores = {
    claimCredibility: Number.isFinite(synthesis.claimCredibility) ? synthesis.claimCredibility : null,
    sourceCredibility: sourceProfile.score,
    evidenceAgreement: Number.isFinite(synthesis.evidenceAgreement) ? synthesis.evidenceAgreement : null,
  };
  const finalScore = calculateCredibility(scores);

  await update(submission, "report_generation", 96, "Generating the investigation report.");
  const payload = {
    submissionId: submission._id,
    scores,
    credibilityScore: finalScore.credibilityScore,
    confidenceLevel: finalScore.confidenceLevel,
    verdict: synthesis.verdict,
    uploadedDocument,
    webEvidence,
    sourceProfile,
    reasoning: synthesis.reasoning,
    evidenceTrail: synthesis.evidenceTrail,
  };

  await Analysis.findOneAndUpdate({ submissionId: submission._id }, payload, { upsert: true, new: true });
  const report = await Report.findOneAndUpdate(
    { submissionId: submission._id },
    { ...payload, summary: synthesis.summary, isDemo: false },
    { upsert: true, new: true },
  );

  Object.assign(submission, { status: "completed", currentStage: "completed", progress: 100, message: "Report generated." });
  await submission.save();
  return report;
}

module.exports = { runInvestigation };
