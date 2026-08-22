const axios = require("axios");
const pdfParse = require("pdf-parse");
const { DocumentChunk } = require("./models");
const { generateEmbedding } = require("./services");

async function extractDocumentText(fileUrl, mimeType) {
  if (!fileUrl) return { available: false, reason: "DOCUMENT_UNAVAILABLE" };
  try {
    const response = await axios.get(fileUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: 25 * 1024 * 1024,
    });
    const buffer = Buffer.from(response.data);
    if (mimeType === "application/pdf") {
      const parsed = await pdfParse(buffer);
      return normalize(parsed.text);
    }
    if (mimeType === "text/plain" || mimeType === "text/markdown")
      return normalize(buffer.toString("utf8"));
    return { available: false, reason: "DOCUMENT_FORMAT_NOT_SUPPORTED" };
  } catch {
    return { available: false, reason: "DOCUMENT_EXTRACTION_FAILED" };
  }
}

function normalize(text) {
  const content = String(text || "").replace(/\s+/g, " ").trim();
  if (!content) return { available: false, reason: "DOCUMENT_EMPTY" };
  return { available: true, text: content.slice(0, 80000), characters: content.length };
}

function chunkText(text, size = 1400, overlap = 200) {
  const chunks = [];
  for (let start = 0; start < text.length; start += size - overlap) {
    const chunk = text.slice(start, start + size).trim();
    if (chunk) chunks.push(chunk);
    if (chunks.length >= 80) break;
  }
  return chunks;
}

async function indexDocument(submissionId, text) {
  const chunks = chunkText(text);
  if (!chunks.length) return { available: false, reason: "DOCUMENT_EMPTY" };
  await DocumentChunk.deleteMany({ submissionId });
  const docs = [];
  for (let i = 0; i < chunks.length; i++) {
    docs.push({
      submissionId,
      chunkIndex: i,
      text: chunks[i],
      embedding: await generateEmbedding(chunks[i]),
    });
  }
  await DocumentChunk.insertMany(docs);
  return { available: true, chunks: docs.length };
}

async function searchDocument(submissionId, query, limit = 5) {
  const vector = await generateEmbedding(query);
  const docs = await DocumentChunk.find({ submissionId }).lean();
  const ranked = docs
    .map((doc) => ({ ...doc, relevance: cosineSimilarity(vector, doc.embedding) }))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
  return {
    available: true,
    chunks: ranked.map((doc) => ({
      chunkIndex: doc.chunkIndex,
      text: doc.text,
      relevance: Math.round(doc.relevance * 100),
    })),
  };
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  return aa && bb ? dot / (Math.sqrt(aa) * Math.sqrt(bb)) : 0;
}

module.exports = { extractDocumentText, indexDocument, searchDocument, chunkText };
