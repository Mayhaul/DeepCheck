const mongoose = require("mongoose");
const submissionSchema = new mongoose.Schema(
  {
    userId: String,
    type: {
      type: String,
      enum: ["image", "video", "audio", "text", "article_url"],
      required: true,
    },
    fileUrl: String,
    fileMeta: Object,
    claim: String,
    sourceUrl: String,
    status: { type: String, default: "pending" },
    currentStage: { type: String, default: "submission_received" },
    progress: { type: Number, default: 0 },
    message: String,
  },
  { timestamps: true },
);
const analysisSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      required: true,
    },
    scores: { forensic: Number, provenance: Number, corroboration: Number },
    trustScore: Number,
    confidenceLevel: String,
    verdict: String,
    forensicDetails: Object,
    provenanceDetails: Object,
    transcript: Object,
    claims: [String],
    reasoning: [String],
    evidenceTrail: [Object],
  },
  { timestamps: true },
);
const reportSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      unique: true,
    },
    summary: String,
    verdict: String,
    trustScore: Number,
    confidenceLevel: String,
    scores: { forensic: Number, provenance: Number, corroboration: Number },
    evidenceTrail: [Object],
    sources: [Object],
    reasoning: [String],
    transcript: [Object],
    provenance: Object,
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);
const sourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    url: { type: String, required: true },
    publisher: String,
    content: { type: String, required: true },
    publishedAt: Date,
    category: String,
    credibility: Number,
    embedding: [Number],
    metadata: Object,
  },
  { timestamps: true },
);
module.exports = {
  Submission: mongoose.model("Submission", submissionSchema),
  Analysis: mongoose.model("Analysis", analysisSchema),
  Report: mongoose.model("Report", reportSchema),
  Source: mongoose.model("Source", sourceSchema),
};
