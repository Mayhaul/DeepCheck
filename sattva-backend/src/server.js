require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const c = require("./controllers");
const { upload, errorHandler, checkSubmission } = require("./middleware");

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => res.json({
  success: true,
  status: "ok",
  demoMode: process.env.DEMO_MODE === "true",
  database: mongoose.connection.readyState === 1 ? "connected" : "unavailable",
  webSearch: Boolean(process.env.BRAVE_SEARCH_API_KEY),
  gemini: Boolean(process.env.GEMINI_API_KEY),
}));

app.post("/api/submissions", upload.single("file"), checkSubmission, c.submit);
app.post("/api/analyze/:id", c.analyze);
app.get("/api/investigation/:id/status", c.status);
app.get("/api/analysis/:id", c.getAnalysis);
app.get("/api/report/:id", c.report);
app.post("/api/forensics", c.forensic);
app.post("/api/rag/search", c.rag);
app.post("/api/web/search", c.webSearch);
app.post("/api/source/history", c.sourceHistory);
app.get("/api/sources/search", (req, res, next) => {
  req.body = { query: req.query.query };
  c.rag(req, res, next);
});
app.use(errorHandler);

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("MongoDB connected");
    } catch (e) {
      console.error("MongoDB unavailable:", e.message);
    }
  } else console.warn("MONGODB_URI not configured");

  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`DeepCheck API listening on ${port}`));
}

start();
