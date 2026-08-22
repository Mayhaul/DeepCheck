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
                              Claude / LLM
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

The backend is a Node.js/Express service that orchestrates the investigation pipeline. It uses MongoDB/Mongoose for persistence, Multer for uploads, Cloudinary for media storage, OpenAI for embeddings, Hugging Face for forensic inference, and Anthropic Claude for evidence-bounded synthesis. fileciteturn13file0

### Investigation flow

```text
1. Submit claim / media / URL
2. Store investigation
3. Start analysis
4. Run applicable analysis steps
5. Retrieve supporting source evidence with RAG
6. Synthesize evidence with the LLM
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

DeepCheck uses a curated corpus of permissioned fact-check/news documents. Documents are embedded with OpenAI embeddings and stored in the `sources` collection in MongoDB Atlas. A Vector Search index named `source_vector_index` is used to retrieve semantically relevant evidence. fileciteturn13file0

## Installation

### Prerequisites

- Node.js
- MongoDB / MongoDB Atlas
- API credentials for the services you enable

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

Then configure the variables in `.env`, including the database connection and any AI/storage credentials required by your setup. fileciteturn13file0

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

## Environment and services

The backend can use:

- `MONGODB_URI` for persistence.
- `CLAUDE_API_KEY` for evidence-bounded synthesis.
- `OPENAI_API_KEY` for embeddings and corpus ingestion.
- `HF_TOKEN` for the configured Hugging Face forensic model.
- Cloudinary variables for production media storage.
- `CLIENT_URL` for the deployed frontend origin. fileciteturn13file0

For local development, the backend also supports `DEMO_MODE=true` for controlled reports that do not call external AI services. fileciteturn13file0

## Important notes

- DeepCheck does not treat a forensic model output as absolute truth.
- Video uploads can be transcribed, but the current image forensic model is not automatically applied to video without representative-frame extraction.
- URL investigation is intended for readable articles/webpages, not arbitrary social-video downloading.
- The RAG corpus is curated rather than built by unrestricted website scraping. fileciteturn13file0

## Status

🚧 Active development

The project is evolving, so APIs, models, UI components, and deployment configuration may change.

## License

License information has not been added yet.
