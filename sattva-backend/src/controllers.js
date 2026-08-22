const { Submission, Analysis, Report } = require("./models");
const { runInvestigation } = require("./agents/sattvaAgent");
const { analyzeMedia } = require("./services");
const { searchSources } = require("./ragService");
const { searchClaim, searchSourceHistory } = require("./webSearchService");
const { uploadFile } = require("./storageService");

async function submit(req, res, next) {
  try {
    const stored = req.file ? await uploadFile(req.file) : null;
    const type = req.body.type;
    const submission = await Submission.create({
      type,
      claim: req.body.claim,
      sourceUrl: req.body.sourceUrl || req.body.url,
      fileUrl: stored?.url,
      fileMeta: stored ? { mimeType: stored.mimeType, bytes: stored.bytes, publicId: stored.publicId } : undefined,
      status: "pending",
      currentStage: "submission_received",
      progress: 0,
      message: "Submission received",
    });
    res.status(201).json({ success: true, submissionId: submission.id, status: submission.status });
  } catch (e) {
    next(e);
  }
}

async function analyze(req, res, next) {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ success: false, error: "SUBMISSION_NOT_FOUND" });
    if (submission.status === "processing") return res.status(202).json({ success: true, submissionId: submission.id, status: submission.status });
    Object.assign(submission, { status: "processing", currentStage: "claim_analysis", progress: 5, message: "Investigation started." });
    await submission.save();
    runInvestigation(submission.id, { demoCase: req.body?.demoCase }).catch(async (e) => {
      const latest = await Submission.findById(submission.id);
      if (latest) {
        latest.status = "failed";
        latest.currentStage = "failed";
        latest.message = e.message;
        await latest.save();
      }
    });
    res.status(202).json({ success: true, submissionId: submission.id, status: "processing" });
  } catch (e) {
    next(e);
  }
}

async function status(req, res, next) {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ success: false, error: "SUBMISSION_NOT_FOUND" });
    res.json({ submissionId: submission.id, stage: submission.currentStage, progress: submission.progress, status: submission.status, message: submission.message });
  } catch (e) {
    next(e);
  }
}

async function getAnalysis(req, res, next) {
  try {
    const analysis = await Analysis.findOne({ submissionId: req.params.id });
    if (!analysis) return res.status(404).json({ success: false, error: "ANALYSIS_NOT_READY" });
    res.json(analysis);
  } catch (e) {
    next(e);
  }
}

async function report(req, res, next) {
  try {
    const report = await Report.findOne({ submissionId: req.params.id });
    if (!report) return res.status(404).json({ success: false, error: "REPORT_NOT_READY" });
    res.json({ ...report.toObject(), status: "completed" });
  } catch (e) {
    next(e);
  }
}

async function forensic(req, res, next) {
  try { res.json(await analyzeMedia(req.body.fileUrl)); } catch (e) { next(e); }
}

async function rag(req, res, next) {
  try { res.json(await searchSources(req.body.query)); } catch (e) { next(e); }
}

async function webSearch(req, res, next) {
  try { res.json(await searchClaim(req.body.query)); } catch (e) { next(e); }
}

async function sourceHistory(req, res, next) {
  try { res.json(await searchSourceHistory(req.body.publisher)); } catch (e) { next(e); }
}

module.exports = { submit, analyze, status, getAnalysis, report, forensic, rag, webSearch, sourceHistory };
