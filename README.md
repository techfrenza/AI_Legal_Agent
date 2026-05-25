# Legal AI Agent

An MVP legal automation tool for solo lawyers: AI-powered contract analysis, compliance checking, document generation from templates, and real-time notifications.

## Repository Structure

```
Legal_AI_Agent/
├── backend/              # FastAPI single-service backend
├── frontend/             # Vite + React + TypeScript app
├── docs/                 # Architecture, API, security, and compliance guides
├── .env.example          # Copy to .env and fill in values
└── CLAUDE.md             # Developer context and architecture notes
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI (single service) |
| Database | SQLite via SQLModel (zero server setup) |
| AI | Claude (Anthropic direct or SAP Hyperspace proxy) or OpenAI |
| Real-time | FastAPI WebSocket |
| Frontend | Vite + React + TypeScript |
| Auth | Single API key header |

## Features

- **Contract Analysis** — AI-powered clause extraction, risk scoring (0–10), and recommendations
- **Compliance Checking** — GDPR, HIPAA, CCPA (and more) pass/fail reports with issue details
- **Document Generation** — Fill `{{variable}}` templates to generate legal documents, with optional AI enhancement
- **Real-time Notifications** — WebSocket alerts for analysis completion and compliance violations

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env — set LLM_PROVIDER and the matching credential (see below), plus API_KEY

# 2. Start backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# Running at http://localhost:8000
# API docs at http://localhost:8000/docs

# 3. Start frontend (separate terminal)
cd frontend
npm install
npm run dev
# Running at http://localhost:5173
```

Open `http://localhost:5173` and enter your `API_KEY` to sign in.

## LLM Providers

Set `LLM_PROVIDER` in `.env` to choose the backend. `LLM_MODEL_DEFAULT` applies to all providers.

| `LLM_PROVIDER` | Credential required | Default model |
|---|---|---|
| `sap_hyperspace` (default) | `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_BASE_URL` | `claude-sonnet-4-5` |
| `anthropic` | `ANTHROPIC_API_KEY` | `claude-sonnet-4-5` |
| `openai` | `OPENAI_API_KEY` (+ `pip install openai`) | `gpt-4o` |

## Environment Variables

```bash
# Provider selection
LLM_PROVIDER=sap_hyperspace          # sap_hyperspace | anthropic | openai
LLM_MODEL_DEFAULT=claude-sonnet-4-5  # model name for the chosen provider

# SAP Hyperspace proxy (LLM_PROVIDER=sap_hyperspace)
ANTHROPIC_BASE_URL=http://localhost:6655/anthropic/
ANTHROPIC_AUTH_TOKEN=<your_sap_hyperspace_token>

# Direct Anthropic (LLM_PROVIDER=anthropic)
# ANTHROPIC_API_KEY=sk-ant-...

# Direct OpenAI (LLM_PROVIDER=openai) — also run: pip install openai
# OPENAI_API_KEY=sk-...

# App
API_KEY=<any_random_secret>          # used as login password
DATABASE_URL=sqlite:///./legal_agent.db
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET/POST | `/documents/` | List / create documents |
| GET/PUT/DELETE | `/documents/{id}` | Get / update / delete document |
| POST | `/analysis/contract/{id}` | Run Claude contract analysis |
| POST | `/analysis/compliance/{id}` | Run Claude compliance check |
| GET | `/analysis/history/{id}` | Past analyses for a document |
| GET/POST | `/templates/` | List / create templates |
| GET | `/templates/{id}/variables` | List `{{placeholders}}` |
| POST | `/templates/{id}/generate` | Fill variables → new document |
| DELETE | `/templates/{id}` | Delete template |
| WS | `/ws/notifications` | Real-time notification stream |

All REST endpoints require `X-API-Key` header. WebSocket has no auth (localhost-only).

## Documentation

- [User Guide](docs/user-guide.md)
- [API Documentation](docs/api.md)
- [Security Guide](docs/security.md)
- [Compliance Guide](docs/compliance.md)
- [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md)
- [Study Guide](docs/Study_Guide.md)
- [Developer Context](CLAUDE.md)

## License

See [LICENSE](LICENSE) for details.
