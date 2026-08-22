# DeepCheck

DeepCheck is a hybrid AI evidence-investigation system for checking claims and assessing the credibility of the sources behind them.

## Core idea

A user provides a **claim/fact to verify** and can optionally upload supporting evidence such as a PDF or text document. DeepCheck independently searches the live web and investigates the public history of the source making the claim.

```text
Claim + User Evidence
        │
        ├── Document RAG ─────────┐
        ├── Tavily Web/News Search ├──> Evidence comparison ──> Gemini ──> Report
        └── Source-history search ┘
```

## Backend

The Node.js/Express backend orchestrates the investigation. MongoDB Atlas stores investigations, reports, curated source embeddings, and per-investigation document chunks. Gemini provides embeddings and evidence synthesis. Tavily provides live web/news retrieval. Media analysis services remain in the backend for later development but are **not exposed in the current frontend product**.

### RAG layers

1. **Uploaded-document RAG:** documents are extracted, chunked, embedded with Gemini, stored for the investigation, and searched against the claim.
2. **Curated knowledge-base RAG:** trusted/permissioned sources remain in MongoDB Atlas Vector Search.
3. **Live web retrieval:** Tavily Web/News Search supplies current independent evidence. Web results are not blindly persisted into the permanent corpus.

### Source credibility

DeepCheck separately searches for historical signals such as fact-checks, misinformation reports, corrections, retractions, and corroboration around the source/publisher. This produces a **source credibility signal**, not proof that the current claim is false.

### Final report

The report keeps these concepts separate:

- **Claim credibility**
- **Source credibility**
- **Evidence agreement**
- **Overall credibility score**
- **Confidence level**
- Evidence trail and source links

## Frontend

The React + Vite frontend currently supports two investigation modes:

- **Claim only**
- **Claim + uploaded document**

The frontend provides the investigation form, document upload, progress polling, and report UI. Image, video, and audio investigation modes are intentionally hidden for now and will be added later.

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
TAVILY_API_KEY=
HF_TOKEN=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLIENT_URL=http://localhost:5173
DEMO_MODE=false
```

Tavily is used as the live retrieval layer for web and news evidence. Gemini handles embeddings and evidence synthesis.

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
