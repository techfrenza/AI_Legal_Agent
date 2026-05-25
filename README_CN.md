# Legal AI Agent

面向独立律师的 MVP 法律自动化工具：AI 驱动的合同分析、合规性检查、基于模板的文档生成，以及实时通知。

## 仓库结构

```
Legal_AI_Agent/
├── backend/              # FastAPI single-service backend
├── frontend/             # Vite + React + TypeScript app
├── docs/                 # Architecture, API, security, and compliance guides
├── .env.example          # Copy to .env and fill in values
└── CLAUDE.md             # Developer context and architecture notes
```

## 技术栈

| 层级 | 技术 |
|---|---|
| 后端 API | FastAPI（单一服务） |
| 数据库 | 通过 SQLModel 使用 SQLite（零服务器配置） |
| AI | Claude（Anthropic 直连或 SAP Hyperspace 代理）或 OpenAI |
| 实时通信 | FastAPI WebSocket |
| 前端 | Vite + React + TypeScript |
| 认证 | 单一 API 密钥请求头 |

## 功能特性

- **合同分析** — AI 驱动的条款提取、风险评分（0–10）及改进建议
- **合规性检查** — GDPR、HIPAA、CCPA（及更多）的通过/不通过报告，附详细问题说明
- **文档生成** — 填充 `{{variable}}` 模板以生成法律文档，支持可选的 AI 增强
- **实时通知** — 分析完成和合规性违规的 WebSocket 告警

## 快速开始

```bash
# 1. 配置环境
cp .env.example .env
# 编辑 .env — 设置 LLM_PROVIDER 及对应凭据（见下文），以及 API_KEY

# 2. 启动后端
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# 运行于 http://localhost:8000
# API 文档见 http://localhost:8000/docs

# 3. 启动前端（新终端）
cd frontend
npm install
npm run dev
# 运行于 http://localhost:5173
```

打开 `http://localhost:5173`，输入您的 `API_KEY` 登录。

## LLM 提供商

在 `.env` 中设置 `LLM_PROVIDER` 以选择后端。`LLM_MODEL_DEFAULT` 适用于所有提供商。

| `LLM_PROVIDER` | 所需凭据 | 默认模型 |
|---|---|---|
| `sap_hyperspace`（默认） | `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_BASE_URL` | `claude-sonnet-4-5` |
| `anthropic` | `ANTHROPIC_API_KEY` | `claude-sonnet-4-5` |
| `openai` | `OPENAI_API_KEY`（+ `pip install openai`） | `gpt-4o` |

## 环境变量

```bash
# 提供商选择
LLM_PROVIDER=sap_hyperspace          # sap_hyperspace | anthropic | openai
LLM_MODEL_DEFAULT=claude-sonnet-4-5  # 所选提供商的模型名称

# SAP Hyperspace 代理 (LLM_PROVIDER=sap_hyperspace)
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

## API 端点

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| GET | `/health` | 健康检查 |
| GET/POST | `/documents/` | 列出 / 创建文档 |
| GET/PUT/DELETE | `/documents/{id}` | 获取 / 更新 / 删除文档 |
| POST | `/analysis/contract/{id}` | 运行 Claude 合同分析 |
| POST | `/analysis/compliance/{id}` | 运行 Claude 合规性检查 |
| GET | `/analysis/history/{id}` | 文档的历史分析记录 |
| GET/POST | `/templates/` | 列出 / 创建模板 |
| GET | `/templates/{id}/variables` | 列出 `{{placeholders}}` |
| POST | `/templates/{id}/generate` | 填充变量 → 生成新文档 |
| DELETE | `/templates/{id}` | 删除模板 |
| WS | `/ws/notifications` | 实时通知流 |

所有 REST 端点均需要 `X-API-Key` 请求头。WebSocket 无需认证（仅限本地访问）。

## 文档

- [用户指南](docs/user-guide.md)
- [API 文档](docs/api.md)
- [安全指南](docs/security.md)
- [合规指南](docs/compliance.md)
- [实施指南](docs/IMPLEMENTATION_GUIDE.md)
- [学习指南](docs/Study_Guide.md)
- [开发者上下文](CLAUDE.md)

## 许可证

详情请参阅 [LICENSE](LICENSE)。
