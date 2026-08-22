# Sattva backend

## Install and run

```powershell
cd sattva-backend
Copy-Item .env.example .env
npm install
npm.cmd run dev
```

Set `MONGODB_URI` for persistence. Set `DEMO_MODE=true` for controlled reports; every such report returns `isDemo: true` and never calls external AI services. File submissions also require the Cloudinary variables because media is stored before forensic or transcription services can access it.

## Environment

`GEMINI_API_KEY` enables Gemini embeddings and evidence-bounded synthesis. `HF_TOKEN` enables the fixed `dima806/deepfake_vs_real_image_detection` inference model. Cloudinary variables are reserved for production file storage.

## Gemini

DeepCheck uses Google's official `@google/genai` SDK. `gemini-embedding-001` generates 1536-dimensional embeddings so they match the current Atlas Vector Search index. `gemini-3.7-flash` generates the evidence-bounded report synthesis.

Get a Gemini API key from Google AI Studio and set it as `GEMINI_API_KEY` in `.env`. Keep the key server-side and never expose it in the frontend.

## Atlas Vector Search

Create a Vector Search index named `source_vector_index` on the `sources` collection:

```json
{
  "fields": [{ "type": "vector", "path": "embedding", "numDimensions": 1536, "similarity": "cosine" }]
}
```

Atlas UI: Database → your cluster → Search → Create Search Index → JSON editor → select `sources`, name it `source_vector_index`, paste the JSON, and create. The Gemini embedding configuration is explicitly reduced to 1536 dimensions to match this index. If the index is missing, the API reports `VECTOR_INDEX_NOT_READY`; it never pretends keyword search is vector search.

## Corpus ingestion

Curate 50–150 permissioned fact-check or news documents yourself. Acceptable JSON/JSONL records contain `title`, `url`, `publisher`, `publishedAt`, `category`, and `content`.

```powershell
npm.cmd run ingest:sources -- data/sources.example.json
```

No arbitrary website scraping is performed. Article URL submissions fetch a readable page only for that investigation; failed fetches report `PAGE_FETCH_FAILED` and are never added to the corpus.

## API

`POST /api/submissions` accepts multipart body `{ type, file|claim|url }`. Types: `image`, `video`, `audio`, `text`, `article_url` (the frontend alias `url` is accepted). Then `POST /api/analyze/:id`; poll `GET /api/investigation/:id/status`; read `GET /api/analysis/:id` and `GET /api/report/:id`.

Other endpoints: `POST /api/forensics`, `POST /api/rag/search`, `POST /api/transcribe`, and `GET /api/health`. Errors use 400 invalid input, 413 oversized upload, 422 invalid file/missing evidence, and 500 service failures.

## Deployment

Deploy the Node service with all environment variables set, a MongoDB Atlas IP/network rule for the host, and `CLIENT_URL` set to the deployed frontend origin. The forensic output is always labelled a **forensic signal**, not a truth detector. Video uploads are accepted and can be transcribed, but the fixed image model is intentionally not applied to a video until representative-frame extraction is added; the report explicitly marks that forensic signal unavailable instead of inventing one.
