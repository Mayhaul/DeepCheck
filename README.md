# DeepCheck

DeepCheck is a hybrid AI evidence-investigation system for checking claims and assessing the credibility of the sources behind them.

## Core idea

A user provides a **claim/fact to verify** and can optionally upload supporting evidence such as a PDF or text document. DeepCheck then independently searches the live web/news and investigates the public history of the source making the claim.

```text
Claim + User Evidence
        │
        ├── Document RAG ─────────┐
        ├── Brave Web/News Search ├──> Evidence comparison ──> Gemini ──> Report
        ├── Source-history search ┘
        └── Media forensics / transcription when applicable
```

## Backend

The Node.js/Express backend orchestrates the investigation. MongoDB Atlas stores investigations, reports, curated source embeddings, and per-investigation document chunks. Gemini provides embeddings and evidence synthesis. Brave Search provides live web/news retrieval. Hugging Face supplies the image-forensic signal. Cloudinary stores uploaded media/documents.

### RAG layers

1. **Uploaded-document RAG:** documents are extracted, chunked, embedded with `gemini-embedding-2`, stored for the investigation, and searched against the claim.
2. **Curated knowledge-base RAG:** trusted/permissioned sources remain in MongoDB Atlas Vector Search.
3. **Live web retrieval:** Brave Web + News Search supplies current independent evidence. Web results are not blindly persisted into the permanent corpus.

### Source credibility

DeepCheck separately searches for historical signals such as fact-checks, misinformation reports, corrections, retractions, and corroboration around the source/publisher. This produces a **source credibility signal**, not proof that the current claim is false.

### Final report

The report keeps these concepts separate:

- **Claim credibility**
- **Source credibility**
- **Evidence agreement**
- **Forensic signal** when media is supplied
- **Overall credibility score**
- **Confidence level**
- Evidence trail and source links

## Frontend

The React + Vite frontend provides the investigation form, evidence upload, progress polling, and report UI. A user can submit a claim alone, claim + document, image/video/audio + claim, or an article URL + claim.

## Setup

### Backend

```bash
cd sattva-backend
npm install
```

Create `sattva-backend/.env` from `.env.example` and add your keys.

```bash
npm run dev
```

### Frontend

```bash
cd sattva-frontend
npm install
npm run dev
```

Optional frontend environment variable:

```env
VITE_API_URL=http://localhost:5000/api
VITE_DEMO_MODE=false
```

## Backend environment

```env
PORT=5000
MONGODB_URI=
GEMINI_API_KEY=
BRAVE_SEARCH_API_KEY=
HF_TOKEN=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLIENT_URL=http://localhost:5173
DEMO_MODE=false
```

Brave Search uses the `X-Subscription-Token` header and exposes separate web and news search endpoints. urlBrave Search API documentationhttps://api-dashboard.search.brave.com/api-reference/web/search/get

Gemini 3.7 Flash is used for synthesis and Gemini Embedding 2 for the vector representations. Gemini Embedding 2 supports 1536-dimensional output, matching the configured Atlas vector-search dimension. citeturn1search1turn3search0

## API

```text
POST /api/submissions
POST /api/analyze/:id
GET  /api/investigation/:id/status
GET  /api/analysis/:id
GET  /api/report/:id
POST /api/rag/search
POST /api/web/search
POST /api/source/history
GET  /api/health
```

## Important limitation

DeepCheck does **not** claim that a source's past mistakes prove its current claim is false. The current claim must be assessed from the evidence available for that claim.

## Status

🚧 Active development
