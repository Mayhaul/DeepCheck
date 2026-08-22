# DeepCheck

DeepCheck is an AI-powered media and information investigation platform designed to help users assess suspicious claims and submitted media using multiple evidence sources.

The project is split into a React/Vite frontend and a Node.js/Express backend. The backend handles investigation workflows, retrieval-augmented search, media analysis, transcription, and evidence-bounded reporting. fileciteturn2file0 fileciteturn4file0

## Problem

Information online can be misleading, manipulated, or difficult to verify quickly. DeepCheck helps users investigate a claim or piece of media by combining multiple signals instead of relying on a simple **fake/real** label.

## What DeepCheck does

- Accepts claims, text, images, video, audio, and article URLs.
- Runs media analysis and other investigation steps.
- Retrieves relevant evidence from a curated source corpus using RAG.
- Uses AI to synthesize the collected evidence into an explainable report.
- Presents a trust score, verdict, confidence, evidence trail, source corroboration, and provenance information.

Forensic analysis is treated as a **signal**, not a definitive truth detector. When evidence is missing or conflicting, the system is designed to expose that limitation rather than invent confidence. fileciteturn13file0

## Architecture

```text
                         ┌─────────────────────┐
                         │   React + Vite UI   │
                         │  sattva-frontend/   │
                         └──────────┬──────────┘
                                    │ Axios / REST
                                    ▼
                         ┌─────────────────────┐
                         │ Node.js + Express   │
                         │  sattva-backend/    │
                         └──────────┬──────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  ▼                 ▼                 ▼
             Forensics             RAG          Transcription
                  │                 │                 │
                  ▼                 ▼                 ▼
             HF Model       MongoDB Atlas        Audio/Text
                                    │
                                    ▼
                              Relevant Sources
                                    │
                                    ▼
                              Gemini 3.7 Flash
                                    │
                                    ▼
                             Final Report
```

## Project structure

```text
DeepCheck/
├── sattva-backend/       # Node.js API, analysis pipeline, RAG and ingestion
│   ├── src/              # Backend application code
│   ├── scripts/          # Corpus ingestion scripts
│   ├── data/             # Example/source data
│   └── .env.example      # Backend environment template
├── sattva-frontend/      # React + Vite frontend
│   ├── src/              # React components, routes, API client and demo data
│   └── package.json
└── .gitignore
```

## Frontend

The frontend is built with **React + Vite** and provides the user-facing investigation workflow. It includes:

- Landing page and investigation entry point.
- Upload/input flows for image, video, audio, text, and article URLs.
- Investigation progress polling while the backend processes evidence.
- Report pages showing trust score, confidence, evidence signals, corroborating sources, and provenance.
- Demo investigation cases.
- Client-side routing with React Router.
- REST API communication through Axios.
- Charts using Recharts and icons using Lucide React.

The frontend package uses React, React Router, Axios, Recharts, Tailwind CSS, Lucide React, Vite, and ESLint. fileciteturn16file0

## Backend

The backend is a Node.js/Express service that orchestrates the investigation pipeline. It uses MongoDB/Mongoose for persistence, Multer for uploads, Cloudinary for media storage, Gemini for embeddings and evidence-bounded synthesis, and Hugging Face for forensic inference.

### Investigation flow

```text
1. Submit claim / media / URL
2. Store investigation
3. Start analysis
4. Run applicable analysis steps
5. Retrieve supporting source evidence with RAG
6. Synthesize evidence with Gemini
7. Generate report
8. Frontend polls status and displays the result
```

### Core API

```text
POST /api/submissions
POST /api/analyze/:id
GET  /api/investigation/:id/status
GET  /api/analysis/:id
GET  /api/report/:id
POST /api/forensics
POST /api/rag/search
POST /api/transcribe
GET  /api/health
```

## RAG / Vector Search

DeepCheck uses a curated corpus of permissioned fact-check/news documents. Documents are embedded with Google's `gemini-embedding-001` model and stored in the `sources` collection in MongoDB Atlas. Embeddings are configured to 1536 dimensions to match the `source_vector_index` configuration.

Gemini 3.7 Flash is then used to synthesize the retrieved evidence and analysis signals into the final report. citeturn0search0turn0search3

## Installation

### Prerequisites

- Node.js
- MongoDB / MongoDB Atlas
- Gemini API key
- Hugging Face token if forensic analysis is enabled
- Cloudinary credentials if media uploads are enabled

### 1. Clone the repository

```bash
git clone https://github.com/Mayhaul/DeepCheck.git
cd DeepCheck
```

### 2. Install backend dependencies

```bash
cd sattva-backend
npm install
```

Create the environment file:

```powershell
Copy-Item .env.example .env
```

Then configure the variables in `.env`.

### 3. Install frontend dependencies

Open another terminal:

```bash
cd sattva-frontend
npm install
```

The frontend supports Vite environment variables. To point it at a backend running somewhere other than the default local API, set:

```env
VITE_API_URL=http://localhost:5000/api
```

The frontend falls back to `http://localhost:5000/api` when `VITE_API_URL` is not provided.

### 4. Start the backend

```bash
cd sattva-backend
npm run dev
```

### 5. Start the frontend

In a second terminal:

```bash
cd sattva-frontend
npm run dev
```

Vite will print the local frontend URL in the terminal.

## Useful commands

### Backend

```bash
npm install
npm run dev
npm start
npm run ingest:sources -- data/sources.example.json
```

### Frontend

```bash
npm install
npm run dev
npm run build
npm run preview
npm run lint
```

## Environment variables

```env
PORT=5000
MONGODB_URI=
GEMINI_API_KEY=
HF_TOKEN=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLIENT_URL=http://localhost:5173
DEMO_MODE=false
```

`GEMINI_API_KEY` is used server-side for both embeddings and report synthesis. Do not expose it in the frontend. The official Google Gen AI JavaScript SDK is `@google/genai`. citeturn1search0turn0search8

For local development, `DEMO_MODE=true` enables controlled reports without external AI calls.

## Important notes

- DeepCheck does not treat a forensic model output as absolute truth.
- Video uploads can be transcribed, but the current image forensic model is not automatically applied to video without representative-frame extraction.
- URL investigation is intended for readable articles/webpages, not arbitrary social-video downloading.
- The RAG corpus is curated rather than built by unrestricted website scraping.
- Gemini embeddings are configured to 1536 dimensions because the Atlas vector index expects 1536 dimensions. citeturn0search3turn0search4

## Status

🚧 Active development

The project is evolving, so APIs, models, UI components, and deployment configuration may change.

## License

License information has not been added yet.
