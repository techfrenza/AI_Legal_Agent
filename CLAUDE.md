# AI Legal Agent — CLAUDE.md

## 1. Project Vision

**Core goal:** MVP legal automation tool for solo lawyers — AI-powered contract analysis, compliance checking, document generation from templates, and real-time notifications via a single FastAPI + React service.

**Tech Stack & Constraints:**
- Backend: Python 3.11+, FastAPI, SQLModel, SQLite, Anthropic SDK (via SAP Hyperspace proxy)
- Frontend: Node.js, Vite, React 18, TypeScript (strict mode)
- WebSocket notifications: in-process, no external broker

[CRITICAL: 严禁建议或引入清单之外的任何替代框架或第三方库。禁止引入 Redis、Celery、PostgreSQL、MongoDB、Django、Express 等替代方案。]
[CRITICAL] Never suggest or introduce any alternative framework or third-party library not listed above.

---

## 2. Golden Rules

- **Read-Before-Write:** Before touching any file, read the target function, its callers, and all related type definitions. No guessing.
- **Precision Edits:** Change only the minimum lines needed to close the current issue. No opportunistic refactors or style cleanups on adjacent healthy code.
- **Premature Abstraction Guard:** ≤3 duplications → copy-paste wins over abstraction. Do not generalize until the third real caller exists.
- **Fail Explicitly:** No silent `except: pass` or bare `catch {}`. Every boundary exception must be raised, logged, or propagated to the outermost error handler.

---

## 3. Architecture & Critical Constraints

### Directory layout (authoritative)
```
backend/
  main.py              ← FastAPI app, CORS, startup
  database.py          ← SQLModel engine, get_session dependency
  models.py            ← Document, AnalysisResult, Template (SQLModel)
  ai_client.py         ← call_llm() / call_claude(); provider switch via LLM_PROVIDER env
  deps.py              ← require_api_key FastAPI dependency
  routers/
    documents.py       ← CRUD /documents
    analysis.py        ← /analysis/contract/{id}, /analysis/compliance/{id}, /analysis/history/{id}
    templates.py       ← CRUD + /templates/{id}/variables + /templates/{id}/generate
    notifications.py   ← WebSocket /ws/notifications, notify_all()

frontend/src/
  App.tsx              ← BrowserRouter, NavBar, NotificationBell, routes
  api.ts               ← typed fetch wrappers; X-API-Key from localStorage
  contexts/AuthContext.tsx
  components/DocumentEditor.tsx
  components/NotificationBell.tsx
  pages/               ← DocumentsPage, DocumentDetailPage, AnalysisPage, TemplatesPage
```

### SAP Hyperspace Proxy [CRITICAL — read before any LLM code change]
```python
# CORRECT — auth_token sends "Authorization: Bearer"
client = anthropic.Anthropic(
    auth_token=os.getenv("ANTHROPIC_AUTH_TOKEN"),
    base_url=os.getenv("ANTHROPIC_BASE_URL", "http://localhost:6655/anthropic/"),
)
# WRONG — api_key= sends "x-api-key" → proxy returns HTTP 401
```
`LLM_PROVIDER` env var selects provider (`sap_hyperspace` | `anthropic` | `openai`). `call_llm()` is canonical; `call_claude` is a backwards-compat alias — do not remove it.

### AI response parsing
Claude is prompted to return JSON. Routers call `json.loads()` and raise `HTTP 502` on parse failure. Never silently discard malformed LLM output.

### Auth
Single `API_KEY` env var. `require_api_key` dependency in `deps.py` enforces it on all REST routes. WebSocket `/ws/notifications` has no auth (localhost-only).

### Template variables
`{{variable_name}}` syntax. `GET /templates/{id}/variables` extracts placeholders. `POST /templates/{id}/generate` substitutes them and creates a new Document.

---

## 4. Agent Workflows

**Multi-file changes:** Enter Plan Mode before any write. Output must include: scope of impact, risk assessment, rollback path. Wait for user confirmation before executing.

**Verification commands (must pass before declaring done):**
```bash
# Backend
cd backend && python -m pytest          # exit code 0 required

# Frontend
cd frontend && npm run typecheck        # tsc --noEmit
cd frontend && npm test                 # vitest
cd frontend && npm run dev              # smoke-check the UI
```

**Commit format:** Angular conventional commits. Message body must explain *why* (context, constraint, tradeoff) — not *what* (the diff already shows that).

---

## 5. Hard Boundaries (NEVER)

- Never read, log, or modify `.env` or any file containing credentials/secrets.
- Never execute `rm`, `DROP TABLE`, or any destructive database command without explicit in-session user confirmation (human-in-the-loop).
- Never run `git push` or open a PR without explicit user instruction in the current session.
- Never suggest direct Anthropic/OpenAI API endpoints in SAP project context — always route through the SAP Hyperspace proxy (see §3).

---

## 6. Definition of Done

Before declaring a task complete, self-check all of the following:

- [ ] Change satisfies the architectural constraints in §3 without introducing new dependencies.
- [ ] `npm run typecheck` passes with zero errors (frontend changes).
- [ ] `python -m pytest` passes with zero failures (backend changes).
- [ ] No new `any` types introduced without an inline justification comment.
- [ ] If a public API endpoint changed, the API Summary table in this file is updated.

---

## 7. Context Compact Guide

On `/compact` or near-context-limit summary, preserve in `<architecture_state>` XML:

```xml
<architecture_state>
  <decisions>[Confirmed tech/architecture choices made this session]</decisions>
  <dead_ends>[Approaches tried and rejected, with reason — prevents re-attempting]</dead_ends>
  <todo>[Remaining atomic tasks with exact next instruction]</todo>
</architecture_state>
```

---

## 9. API Reference (current endpoints)

| Method | Path | Auth |
|--------|------|------|
| GET | /health | none |
| GET/POST | /documents/ | X-API-Key |
| GET/PUT/DELETE | /documents/{id} | X-API-Key |
| POST | /analysis/contract/{id} | X-API-Key |
| POST | /analysis/compliance/{id} | X-API-Key |
| GET | /analysis/history/{id} | X-API-Key |
| GET/POST | /templates/ | X-API-Key |
| GET | /templates/{id}/variables | X-API-Key |
| POST | /templates/{id}/generate | X-API-Key |
| DELETE | /templates/{id} | X-API-Key |
| WS | /ws/notifications | none |

---

## 8. AGENTS.md Soft Link

AGENTS.md contains only `@CLAUDE.md` — it soft-links here to pull the full contract.
