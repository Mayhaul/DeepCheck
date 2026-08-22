const { Submission, Analysis, Report } = require("./models");
const { runInvestigation } = require("./agents/sattvaAgent");
const { analyzeMedia } = require("./services");
const { searchSources } = require("./ragService");
const { uploadFile } = require("./storageService");
async function submit(req, res, next) {
  try {
    const type = req.body.type;
    const stored = req.file ? await uploadFile(req.file) : null;
    const s = await Submission.create({
      type: type === "url" ? "article_url" : type,
      claim: req.body.claim,
      sourceUrl: req.body.sourceUrl || req.body.url,
      fileUrl: stored?.url,
      fileMeta: stored
        ? {
            mimeType: stored.mimeType,
            bytes: stored.bytes,
            publicId: stored.publicId,
          }
        : undefined,
      status: "pending",
      currentStage: "submission_received",
      progress: 0,
      message: "Submission received",
    });
    res
      .status(201)
      .json({ success: true, submissionId: s.id, status: s.status });
  } catch (e) {
    next(e);
  }
}
async function analyze(req, res, next) {
  try {
    const s = await Submission.findById(req.params.id);
    if (!s)
      return res
        .status(404)
        .json({ success: false, error: "SUBMISSION_NOT_FOUND" });
    if (s.status === "processing")
      return res
        .status(202)
        .json({ success: true, submissionId: s.id, status: s.status });
    Object.assign(s, {
      status: "processing",
      currentStage: "claim_analysis",
      progress: 5,
      message: "Investigation started.",
    });
    await s.save();
    runInvestigation(s.id, { demoCase: req.body?.demoCase }).catch(
      async (e) => {
        const latest = await Submission.findById(s.id);
        if (latest) {
          latest.status = "failed";
          latest.currentStage = "failed";
          latest.message = e.message;
          await latest.save();
        }
      },
    );
    res
      .status(202)
      .json({ success: true, submissionId: s.id, status: "processing" });
  } catch (e) {
    next(e);
  }
}
async function status(req, res, next) {
  try {
    const s = await Submission.findById(req.params.id);
    if (!s)
      return res
        .status(404)
        .json({ success: false, error: "SUBMISSION_NOT_FOUND" });
    res.json({
      submissionId: s.id,
      stage: s.currentStage,
      progress: s.progress,
      status: s.status,
      message: s.message,
    });
  } catch (e) {
    next(e);
  }
}
async function getAnalysis(req, res, next) {
  try {
    const a = await Analysis.findOne({ submissionId: req.params.id });
    if (!a)
      return res
        .status(404)
        .json({ success: false, error: "ANALYSIS_NOT_READY" });
    res.json(a);
  } catch (e) {
    next(e);
  }
}
async function report(req, res, next) {
  try {
    const r = await Report.findOne({ submissionId: req.params.id });
    if (!r)
      return res
        .status(404)
        .json({ success: false, error: "REPORT_NOT_READY" });
    res.json({ ...r.toObject(), status: "completed" });
  } catch (e) {
    next(e);
  }
}
async function forensic(req, res, next) {
  try {
    res.json(await analyzeMedia(req.body.fileUrl));
  } catch (e) {
    next(e);
  }
}
async function rag(req, res, next) {
  try {
    res.json(await searchSources(req.body.query));
  } catch (e) {
    next(e);
  }
}
module.exports = {
  submit,
  analyze,
  status,
  getAnalysis,
  report,
  forensic,
  rag,
};
