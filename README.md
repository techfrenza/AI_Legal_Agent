# AI Legal Agent

> A comprehensive legal automation platform with AI-powered document management,
> multi-jurisdiction compliance checking, and advanced security.
>
> See [AI_AGENT_DESIGN.md](AI_AGENT_DESIGN.md) for the modernization roadmap using
> Supervisor Agents, Sub-agents, MCP Servers, RAG, and Human-in-the-Loop patterns.

---

## Table of Contents

1. [Quick Start (Container)](#1-quick-start-container)
2. [System Overview](#2-system-overview)
3. [Container Setup  Podman](#3-container-setup--podman)
4. [Local Development Setup](#4-local-development-setup)
5. [AI Agent Architecture](#5-ai-agent-architecture)
6. [Security Features](#6-security-features)
7. [API Documentation](#7-api-documentation)
8. [Running Tests](#8-running-tests)
9. [Deployment](#9-deployment)
10. [Known Issues & Roadmap](#10-known-issues--roadmap)

---

## 1. Quick Start (Container)

```bash
# Prerequisites: Podman 4+ and podman-compose  (or Docker + docker compose)
git clone https://github.com/your-org/ai-legal-agent.git
cd ai-legal-agent

cp .env.example .env
# Edit .env  set JWT_SECRET_KEY, ENCRYPTION_MASTER_KEY, ANTHROPIC_API_KEY

bash scripts/start.sh       # starts all services; prints port table
```

Service URLs after startup:

| Service              | URL                         | Notes                        |
|----------------------|-----------------------------|------------------------------|
| Frontend             | http://localhost:3000        | React UI                     |
| API Gateway          | http://localhost:8000        | Entry point for all clients  |
| AI Orchestrator      | http://localhost:8001        | LLM + NLP pipeline           |
| Document Service     | http://localhost:8002        |                              |
| Compliance Service   | http://localhost:8003        |                              |
| Audit Service        | http://localhost:8004        | MongoDB-backed               |
| Notification Service | http://localhost:8005        | WebSocket: ws://localhost:8005 |
| Template Service     | http://localhost:8006        |                              |
| Integration Service  | http://localhost:8007        |                              |

---

## 2. System Overview

### Core Features
- Document automation and management (DOCX, PDF, Markdown)
- AI-powered legal analysis (contract review, risk assessment, compliance)
- Multi-jurisdiction compliance checking (GDPR, HIPAA, CCPA)
- Advanced security controls (AES-256-GCM, JWT, RBAC)
- Comprehensive audit logging with hash-chain integrity

### Architecture
```
Frontend (React/TypeScript)
        |
   API Gateway (FastAPI)
        |
   
                                                
AI Orchestrator    Document    Compliance    Template
(LLM + NLP)        Service      Service      Service
                      |            |
                Audit Service  Notification  Integration
                (MongoDB)       Service       Service
                      |
              PostgreSQL + pgvector   Redis
```

### Technology Stack
- **Backend**: Python 3.11, FastAPI, SQLAlchemy 2.0, asyncpg
- **AI / NLP**: Claude (Anthropic), Legal-BERT, spaCy en_core_web_lg
- **Databases**: PostgreSQL 16 + pgvector, MongoDB 7, Redis 7
- **Frontend**: React 18, TypeScript, Monaco Editor, Material UI
- **Containers**: Podman / Docker, podman-compose

---

## 3. Container Setup  Podman

### Prerequisites

| Tool | Minimum Version | Install |
|------|----------------|---------|
| Podman | 4.0+ | https://podman.io/docs/installation |
| podman-compose | 1.0+ | `pip install podman-compose` |
| OR: podman compose (built-in) | Podman 4.4+ | included with Podman |

> **Docker alternative**: All files are fully compatible with Docker Compose.
> Replace `podman compose` with `docker compose` everywhere.

### Configuration

```bash
# 1. Copy and edit the environment file
cp .env.example .env

# 2. Generate secure secrets (required)
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_hex(32))"
python -c "import secrets; print('ENCRYPTION_MASTER_KEY=' + secrets.token_hex(32))"
# Paste output values into .env

# 3. Add your AI provider key
# Edit .env: ANTHROPIC_API_KEY=sk-ant-...
```

### Build & Run

```bash
# Build all images and start (first run  downloads spaCy model, ~5 min)
podman compose up --build

# Background mode
podman compose up --build -d

# Or use the helper script
bash scripts/start.sh
```

### Common Commands

```bash
# View running services
podman compose ps

# Tail all logs
podman compose logs -f

# Tail a specific service
podman compose logs -f ai-orchestrator

# Stop all services (preserves data volumes)
podman compose down

# Stop and remove all data (full reset)
podman compose down -v --rmi local

# Rebuild a single service after code changes
podman compose up --build document-service
```

### Container Images

| Service | Approx. Image Size | Notes |
|---|---|---|
| api-gateway | ~250 MB | |
| ai-orchestrator | ~3.5 GB | spaCy model + PyTorch (CPU) |
| document-service | ~450 MB | mammoth, python-docx, pypdf |
| compliance-service | ~250 MB | |
| audit-service | ~250 MB | motor (MongoDB async) |
| notification-service | ~250 MB | |
| template-service | ~280 MB | Jinja2 |
| integration-service | ~250 MB | |
| frontend | ~50 MB | nginx + React build |

> **Tip**: The ai-orchestrator image is large because it bundles PyTorch (CPU)
> and downloads the spaCy `en_core_web_lg` model at build time. The layer is
> cached after the first build, so subsequent rebuilds are fast.

### Podman-Specific Notes

- All services run as **non-root** (UID 1000)  compatible with rootless Podman.
- nginx in the frontend container listens on **port 8080** (not 80) to avoid
  the need for `NET_BIND_SERVICE` capabilities in rootless mode.
- The `compose.yml` uses `service_completed_successfully` for the `init-db`
  service  requires Podman 4.4+ or Docker Compose v2.4+.
- On SELinux systems (RHEL, Fedora), bind-mounted volumes may need `:z` or `:Z`
  labels. If scripts/ fails to mount, add `- ./scripts:/app/scripts:ro,z`.

---

## 4. Local Development Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 16 + pgvector extension
- MongoDB 7+
- Redis 7+

### Installation

```bash
# Backend
python -m venv venv
source venv/bin/activate          # Windows: .\venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### Environment

```bash
cp .env.example .env
# Set DATABASE_URL, MONGODB_URI to point to local instances
```

### Running Individual Services Locally

```bash
# From repo root, with venv activated
export PYTHONPATH=$PWD

uvicorn backend.api_gateway.main:app         --reload --port 8000
uvicorn backend.ai_orchestrator.app:app      --reload --port 8001
uvicorn backend.document_service.app:app     --reload --port 8002
uvicorn backend.compliance_service.app:app   --reload --port 8003
uvicorn backend.audit_service.app:app        --reload --port 8004
uvicorn backend.notification_service.app:app --reload --port 8005
uvicorn backend.template_service.app:app     --reload --port 8006
uvicorn backend.integration_service.app:app  --reload --port 8007
```

---

## 5. AI Agent Architecture

The current codebase uses a static orchestrator with fine-tuned NLP models.
The modernization plan (see [AI_AGENT_DESIGN.md](AI_AGENT_DESIGN.md)) evolves
this into an LLM-native agentic architecture:

| Pillar | Component | Purpose |
|--------|-----------|---------|
| 1 | Supervisor Agent | LLM-driven dynamic planning (replaces static `workflows` dict) |
| 2 | Specialized Sub-Agents | Contract review, compliance, research, drafting, risk  each LLM-powered with tools |
| 3 | MCP Servers | Each backend service exposed as a tool via Model Context Protocol |
| 4 | RAG Pipeline | pgvector over regulations, case law, and precedents |
| 5 | Human-in-the-loop | Approval gates for high-risk decisions |
| 6 | Guardrails | Citation verification, PII detection, confidence scoring |

---

## 6. Security Features

### Document Security
- Content encrypted at rest with AES-256-GCM
- Per-document key derived via PBKDF2 (100,000 iterations)
- Salt + nonce prepended to ciphertext for deterministic decryption
- Hash-based version integrity (SHA-256)

### User Security
- JWT tokens (1 hr) + server-side sessions (24 hr, max 5 per user)
- Passwords hashed with pbkdf2_sha256 via passlib
- RBAC: User  Role  Permission (cached 5 min)
- Rate limiting: 5 login attempts per 15 min per IP
- Anomaly detection via ActivityMonitor

### Compliance Security
- PII detection  mask / encrypt / redact
- Hash-chain audit trails (tamper-evident)
- Regulatory change tracking (GDPR, HIPAA, CCPA)

---

## 7. API Documentation

### Authentication
```http
POST /api/auth/login        {"username": "...", "password": "..."}
POST /api/auth/refresh      Authorization: Bearer {token}
POST /api/auth/logout       Authorization: Bearer {token}
```

### Documents
```http
POST   /api/documents               Create document
GET    /api/documents/{id}          Get document
PUT    /api/documents/{id}          Update document
DELETE /api/documents/{id}          Delete document
```

### Compliance
```http
POST /api/compliance/check          {"document_id": "...", "jurisdictions": [...]}
GET  /api/compliance/report/{id}    Get compliance report
GET  /api/compliance/audit-trail    Get audit trail
```

---

## 8. Running Tests

```bash
# All tests
pytest backend/tests/ -v

# By category
pytest backend/tests/unit/
pytest backend/tests/integration/
pytest backend/tests/security/
pytest backend/tests/compliance/
pytest backend/tests/performance/

# Code quality
flake8 backend/
bandit -r backend/         # security scan
```

---

## 9. Deployment

### Production Checklist

- [ ] Generate real `JWT_SECRET_KEY` and `ENCRYPTION_MASTER_KEY` (32+ chars)
- [ ] Set `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`)
- [ ] Configure SSL/TLS (terminate at reverse proxy / load balancer)
- [ ] Change default PostgreSQL password in `.env`
- [ ] Enable MongoDB authentication
- [ ] Set `ALLOWED_ORIGINS` to your domain
- [ ] Configure firewall rules (expose only ports 80/443 externally)
- [ ] Enable log rotation and monitoring
- [ ] Configure automated database backups

### Container Deploy (Production)

```bash
# Production compose override
podman compose -f compose.yml -f compose.prod.yml up -d

# Or build and push to a registry
podman build -f backend/api-gateway/Dockerfile -t registry.example.com/legal/api-gateway:latest .
podman push registry.example.com/legal/api-gateway:latest
```

---

## 10. Known Issues & Roadmap

### Current Limitations (as of March 2026)

| Area | Issue |
|------|-------|
| Database | Many service methods are `pass` placeholders  DB interactions not yet implemented |
| Migrations | Alembic not configured; `scripts/init_db.py` uses `create_all()` for local dev |
| Imports | Relative imports in some modules reference non-existent sibling packages |
| Tests | Test files are skeleton-only; not runnable end-to-end |
| Frontend | Only 3 components; no routing, no full page layout |
| Inter-service | No service discovery; services call each other by hardcoded container name |

### Roadmap

See [AI_AGENT_DESIGN.md](AI_AGENT_DESIGN.md) for the full 6-phase plan:

1. **Phase 1** (weeks 1-3): Wrap services as MCP Servers
2. **Phase 2** (weeks 3-5): Add RAG pipeline (pgvector)
3. **Phase 3** (weeks 5-8): Introduce Supervisor Agent (Claude)
4. **Phase 4** (weeks 8-12): Migrate sub-agents to LLM-powered
5. **Phase 5** (weeks 12-14): Human-in-the-loop + guardrails
6. **Phase 6** (weeks 14-16): Full conversational frontend

---

## License

See [LICENSE](LICENSE) file for details.
