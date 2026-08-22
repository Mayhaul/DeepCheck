# DeepCheck

DeepCheck is an AI-powered media and information investigation platform designed to help users assess suspicious claims and submitted media using multiple evidence sources.

The project currently contains a web frontend and a Node.js backend under `sattva-frontend/` and `sattva-backend/`. The backend supports investigation workflows, retrieval-augmented search, media analysis, transcription, and evidence-bounded reporting. fileciteturn2file0 fileciteturn4file0

## What it does

- Accepts claims, text, images, video, audio, and article URLs for investigation.
- Combines forensic signals with retrieved source evidence.
- Supports RAG-based source search through MongoDB Atlas Vector Search.
- Uses AI services for evidence-bounded synthesis and embeddings when configured.
- Produces reports that distinguish forensic signals from definitive truth claims.

## Project structure

```text
DeepCheck/
├── sattva-backend/     # Node.js API, analysis pipeline, RAG and ingestion
├── sattva-frontend/    # Web interface
└── .gitignore
```

## Backend setup

```powershell
cd sattva-backend
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

Configure the required environment variables in `.env`. The backend documentation covers MongoDB, AI provider keys, Hugging Face inference, Cloudinary storage, Atlas Vector Search, corpus ingestion, and deployment details. fileciteturn4file0

## Core API

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

DeepCheck uses a MongoDB Atlas Vector Search index named `source_vector_index`. The current backend documentation specifies a 1536-dimensional cosine-similarity vector index for the `sources.embedding` field. fileciteturn4file0

## Important design principle

DeepCheck treats forensic analysis as a **signal**, not a definitive truth detector. When evidence is unavailable, the system is designed to report that limitation instead of fabricating confidence. fileciteturn4file0

## Status

🚧 Active development

The repository is being developed as an end-to-end AI investigation platform, so APIs, models, and UI components may evolve.

## License

License information has not been added yet.
