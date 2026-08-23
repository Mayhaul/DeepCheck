require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const controllers = require("./controllers");
const { checkGemini } = require("./services");
const { upload, errorHandler, checkSubmission } = require("./middleware");

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    demoMode: process.env.DEMO_MODE === "true",
    database: mongoose.connection.readyState === 1 ? "connected" : "unavailable",
    webSearch: Boolean(process.env.TAVILY_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
  });
});

app.get("/api/health/gemini", async (req, res) => {
  try {
    const result = await checkGemini();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Gemini health check failed:", {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status,
      statusText: error.statusText,
    });
    res.status(503).json({
      success: false,
      error: "GEMINI_UNAVAILABLE",
      message: error.message,
      code: error.code || null,
      status: error.status || null,
    });
  }
});

app.post("/api/submissions", upload.single("file"), checkSubmission, controllers.submit);
app.post("/api/analyze/:id", controllers.analyze);
app.get("/api/investigation/:id/status", controllers.status);
app.get("/api/analysis/:id", controllers.getAnalysis);
app.get("/api/report/:id", controllers.report);

// Media routes remain available internally but are not exposed by the current frontend.
app.post("/api/forensics", controllers.forensic);

app.post("/api/rag/search", controllers.rag);
app.post("/api/web/search", controllers.webSearch);
app.post("/api/source/history", controllers.sourceHistory);
app.get("/api/sources/search", (req, res, next) => {
  req.body = { query: req.query.query };
  controllers.rag(req, res, next);
});

app.use(errorHandler);

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("MongoDB connected");
    } catch (error) {
      console.error("MongoDB unavailable:", error.message);
    }
  } else {
    console.warn("MONGODB_URI not configured");
  }

  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`DeepCheck API listening on ${port}`));
}

start();
