# AI Legal Agent  Architecture Modernization Design

> A proposal to evolve the current static-orchestrator + fine-tuned-model architecture into a modern, LLM-native agentic system using AI Agents, Sub-agents, MCP Servers, RAG, and Human-in-the-Loop patterns.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Analysis](#2-current-architecture-analysis)
3. [Proposed Architecture Overview](#3-proposed-architecture-overview)
4. [Pillar 1  Supervisor Agent](#4-pillar-1--supervisor-agent)
5. [Pillar 2  Specialized Sub-Agents](#5-pillar-2--specialized-sub-agents)
6. [Pillar 3  MCP Servers](#6-pillar-3--mcp-servers)
7. [Pillar 4  RAG Pipeline](#7-pillar-4--rag-pipeline)
8. [Pillar 5  Human-in-the-Loop Approval Gates](#8-pillar-5--human-in-the-loop-approval-gates)
9. [Pillar 6  Evaluation, Guardrails & Observability](#9-pillar-6--evaluation-guardrails--observability)
10. [Migration Mapping: Existing Code  New Architecture](#10-migration-mapping-existing-code--new-architecture)
11. [Technology Choices](#11-technology-choices)
12. [Phased Migration Plan](#12-phased-migration-plan)
13. [Cost & Performance Considerations](#13-cost--performance-considerations)
14. [Appendix  Sequence Diagrams](#14-appendix--sequence-diagrams)

---

## 1. Executive Summary

The current AI Legal Agent uses a **static orchestrator** (`AIOrchestrator`) that maps task types to predefined agent sequences via a hard-coded `workflows` dictionary. Each agent (e.g., `ContractReviewAgent`) is a monolithic class that loads fine-tuned NLP models (Legal-BERT, spaCy) at init time and performs a single-pass analysis with no iteration or reasoning.

This design has several limitations:
- **Rigid routing**  cannot adapt workflows based on intermediate results
- **No reasoning**  agents classify and score but do not reason about *why*
- **No knowledge retrieval**  rules are hard-coded; no access to regulation databases, case law, or prior analyses
- **No human oversight**  fully automated pipeline with no approval checkpoints
- **Brittle integrations**  each external system requires custom `aiohttp` code
- **No memory**  the system cannot learn from past reviews or user feedback

The proposed architecture replaces this with an **LLM-native agentic system** built on six pillars:

```

                        USER / FRONTEND                          
              (Chat UI, Document Editor, Approvals)              

                             
                             

                     SUPERVISOR AGENT                            
         (LLM-powered planning, delegation, iteration)          
                                                                 
               
   Contract  Compliance  Research   Drafting   ...       
   Review      Agent      Agent      Agent              
  Sub-Agent  Sub-Agent  Sub-Agent  Sub-Agent            
               
                                                             
                       
                           Tool Calls (MCP)                     

                           
          
                                               
  
  MCP Servers   RAG Pipeline   Human-in-the-Loop    
                                                    
  Legal DB      Regulations   Approval Gates     
  Doc Mgmt      Case Law      Review Requests    
  E-Sign        Precedents    Escalations        
  Audit         Templates                         
  Notify                                           
  
                                               
          
                           
              
               Guardrails &         
               Observability Layer  
                                    
                Citation checks    
                PII detection      
                Confidence scoring 
                Audit logging      
                Token tracking     
              
```

---

## 2. Current Architecture Analysis

### 2.1 What Exists Today

| Component | File(s) | Approach | Limitation |
|---|---|---|---|
| **Orchestrator** | `ai-orchestrator/orchestrator.py` | Static `workflows` dict maps task_type  agent list; `asyncio.gather` for parallel execution | No dynamic planning; cannot adapt based on intermediate results |
| **Contract Review** | `agents/contract_review_agent.py` | Legal-BERT + spaCy pipelines for classification, NER, summarization | Single-pass; no reasoning about *why* a clause is risky |
| **Compliance** | `compliance-service/rule_engine.py` | Rule parser evaluates conditions/actions against documents | Rules must be manually coded; no regulation database |
| **Integrations** | `integration-service/interfaces/*` | Custom `aiohttp` per external system | Brittle; no standard protocol |
| **Notification** | `notification-service/` | WebSocket + REST | No human-in-the-loop capability |
| **Security** | `security/*` | AES-256-GCM, JWT, RBAC, audit trails | Well-designed  should be preserved |

### 2.2 Key Gaps

1. **No LLM reasoning**  the system classifies and scores but cannot explain its analysis in natural language
2. **No retrieval**  no way to search thousands of regulations, case law, or prior analyses
3. **No iteration**  if compliance check fails, the system cannot automatically suggest fixes and re-check
4. **No conversation**  users cannot ask follow-up questions about an analysis
5. **No human gates**  high-stakes legal decisions happen without lawyer review
6. **No learning**  the system cannot improve from feedback or past reviews

---

## 3. Proposed Architecture Overview

### 3.1 Core Architectural Shifts

| Aspect | Current | Proposed |
|---|---|---|
| **Orchestration** | Static `workflows` dict  agent list | LLM Supervisor Agent dynamically plans and delegates |
| **AI Models** | Legal-BERT classification + spaCy NER | Foundation model (Claude) with tool use + specialized models as tools |
| **Agent Pattern** | `BaseAgent.process()`  single-pass | Agentic loop: reason  act  observe  iterate until done |
| **External Tools** | Hard-coded `aiohttp` calls | **MCP Servers** exposing tools via standard protocol |
| **Knowledge** | Hard-coded rules in `RuleEngine` | **RAG pipeline** over regulations, case law, templates |
| **Human Oversight** | None  fully automated | **Human-in-the-loop** approval gates for high-stakes decisions |
| **Inter-service Comm** | Missing (known issue) | MCP protocol unifies all tool access |
| **User Interaction** | Submit task  get result | Conversational  ask questions, get explanations, request changes |

### 3.2 Design Principles

1. **Tool-use over hard-coding**  agents call tools (via MCP) instead of containing business logic
2. **Reasoning over classification**  LLMs explain *why*, not just *what*
3. **Iteration over single-pass**  agents can retry, revise, and improve
4. **Retrieval over memorization**  ground every response in retrievable evidence
5. **Human oversight for high stakes**  automated for routine, human-gated for critical
6. **Preserve security infrastructure**  the existing encryption, RBAC, and audit layers are sound

---

## 4. Pillar 1  Supervisor Agent

### 4.1 What It Replaces

The `AIOrchestrator` class in `backend/ai-orchestrator/orchestrator.py`:

```python
# CURRENT  static routing
workflows = {
    'contract_analysis': ['contract_review', 'risk_assessment', 'compliance'],
    'document_generation': ['document_generation', 'compliance'],
    'legal_research': ['legal_research', 'document_generation'],
    'risk_analysis': ['risk_assessment', 'compliance']
}
```

### 4.2 What It Becomes

An LLM-powered **Supervisor Agent** that dynamically plans multi-step workflows:

```python
# PROPOSED  dynamic planning via LLM
class SupervisorAgent:
    """
    Replaces AIOrchestrator with LLM-driven planning and delegation.
    Uses Claude as the reasoning engine with tool-use for sub-agent delegation.
    """

    def __init__(self, llm_client, sub_agents: dict, mcp_clients: dict):
        self.llm = llm_client
        self.sub_agents = sub_agents          # name  SubAgent
        self.mcp_clients = mcp_clients        # name  MCP client
        self.system_prompt = SUPERVISOR_SYSTEM_PROMPT

    async def handle_request(self, user_request: str, context: dict) -> AgentResult:
        """
        Process a user request through iterative planning and delegation.
        The LLM decides which sub-agents to invoke and in what order.
        """
        messages = [{"role": "user", "content": user_request}]
        tools = self._build_tool_definitions()  # Sub-agents + MCP tools

        while True:
            response = await self.llm.create_message(
                system=self.system_prompt,
                messages=messages,
                tools=tools,
                max_tokens=4096
            )

            # If the LLM wants to call tools, execute them
            if response.stop_reason == "tool_use":
                tool_results = await self._execute_tool_calls(response.tool_calls)
                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": tool_results})
                continue

            # Otherwise, the LLM is done  return final response
            return AgentResult(
                content=response.content,
                audit_trail=self._extract_audit_trail(messages)
            )
```

### 4.3 Supervisor System Prompt (example)

```
You are a senior legal AI assistant that coordinates specialized sub-agents
to analyze, draft, and review legal documents.

Your capabilities:
- delegate_to_contract_review: Analyze contract clauses, obligations, and risks
- delegate_to_compliance_agent: Check document compliance against regulations
- delegate_to_research_agent: Search case law and statutory references
- delegate_to_drafting_agent: Generate or revise document content
- delegate_to_risk_agent: Quantify and assess risks
- request_human_approval: Escalate to a human lawyer for review

Planning rules:
1. Always identify the jurisdiction(s) before starting analysis
2. For contract review: extract clauses first, then assess risks, then check compliance
3. If compliance issues are found, ask the drafting agent to suggest revisions
4. After revisions, re-run compliance check to verify fixes
5. For high-risk findings (risk score > 0.7), always request human approval
6. Cite specific regulations or case law for every finding
7. Never provide final legal advice without human approval for critical matters
```

### 4.4 Key Behaviors

- **Dynamic planning**: The LLM decides the workflow at runtime based on the request, not from a static dict
- **Iterative execution**: If a compliance check fails, the supervisor can ask the drafting agent to fix the issue and re-check  something the current `asyncio.gather` approach cannot do
- **Context accumulation**: Each sub-agent result feeds into the next decision, enabling sophisticated multi-step reasoning
- **Graceful degradation**: If a sub-agent fails, the supervisor can try alternative approaches or escalate to human review

---

## 5. Pillar 2  Specialized Sub-Agents

### 5.1 What They Replace

The current agents (e.g., `ContractReviewAgent`) are monolithic classes that load HuggingFace models at init and run a single-pass pipeline. Each new capability requires writing a new Python class with custom model-loading code.

### 5.2 What They Become

Each sub-agent is an **LLM-powered agent with domain-specific tools and a system prompt**. The same `BaseAgent` pattern (preprocess  process  postprocess) is preserved, but `process()` now runs an agentic LLM loop instead of a pipeline.

### 5.3 Sub-Agent Definitions

#### Contract Review Sub-Agent

| Property | Value |
|---|---|
| **System Prompt** | Expert contract analyst. Extract clauses, identify obligations, detect ambiguities, assess enforceability. |
| **Tools** | `extract_clauses`, `classify_clause_type`, `search_precedents`, `assess_risk_score`, `lookup_jurisdiction_rules` |
| **Iterates?** | Yes  extraction  analysis  risk scoring  re-analysis if needed |
| **Replaces** | `contract_review_agent.py` (Legal-BERT pipelines) |

```python
class ContractReviewSubAgent:
    """
    LLM-powered contract review. Replaces the monolithic ContractReviewAgent
    that loaded Legal-BERT + spaCy at init.

    Legal-BERT is now available as a *tool* for fast bulk classification
    when the LLM determines it's more efficient than reasoning per-clause.
    """

    system_prompt = """You are an expert contract review attorney.
    Analyze contracts by:
    1. Extracting all clauses and classifying their type
    2. Identifying obligations, rights, and conditions for each party
    3. Detecting ambiguous or missing language
    4. Assessing risk for each clause
    5. Checking enforceability under the specified jurisdiction
    Always cite specific legal principles for your findings."""

    tools = [
        # Fast bulk classification via existing Legal-BERT (retained as a tool)
        Tool("classify_clauses_bulk", "Classify clause types using Legal-BERT model"),
        # RAG retrieval
        Tool("search_similar_clauses", "Find similar clauses from precedent database"),
        Tool("lookup_jurisdiction_rules", "Get jurisdiction-specific contract rules"),
        # Scoring
        Tool("calculate_risk_score", "Calculate quantitative risk score for a clause"),
    ]
```

#### Compliance Sub-Agent

| Property | Value |
|---|---|
| **System Prompt** | Regulatory compliance specialist. Check documents against GDPR, CCPA, HIPAA, and jurisdiction-specific regulations. |
| **Tools** | `get_jurisdiction_rules`, `search_regulations`, `check_gdpr_article`, `check_ccpa_section`, `check_hipaa_rule`, `get_regulatory_updates` |
| **Iterates?** | Yes  identify jurisdictions  retrieve rules  check each  report |
| **Replaces** | `compliance-service/rule_engine.py`, `compliance_checker.py` |

#### Legal Research Sub-Agent

| Property | Value |
|---|---|
| **System Prompt** | Legal researcher. Search case law, statutes, and secondary sources. Summarize findings with citations. |
| **Tools** | `search_case_law`, `get_case_details`, `search_statutes`, `find_similar_precedents`, `summarize_ruling` |
| **Iterates?** | Yes  broad search  narrow  deep read  synthesize |
| **Replaces** | `integration-service/interfaces/legal_research.py` |

#### Drafting Sub-Agent

| Property | Value |
|---|---|
| **System Prompt** | Legal document drafter. Generate and revise contracts, policies, and agreements using templates and precedent language. |
| **Tools** | `get_template`, `render_template`, `search_precedent_language`, `suggest_clause_revision`, `convert_format` |
| **Iterates?** | Yes  draft  self-review  revise  validate |
| **Replaces** | `document-service/document_generator.py`, `template_processor.py`, `nlp_processor.py` |

#### Risk Assessment Sub-Agent

| Property | Value |
|---|---|
| **System Prompt** | Risk analyst. Quantify legal, financial, and operational risks. Produce structured risk assessments. |
| **Tools** | `calculate_risk_score`, `get_historical_risk_data`, `identify_risk_factors`, `compare_industry_benchmarks` |
| **Iterates?** | Yes  identify factors  score  contextualize  recommend |
| **Replaces** | Part of `contract_review_agent.py` risk assessment logic |

### 5.4 Retaining Existing Models as Tools

The current Legal-BERT and spaCy models are not discarded. They become **tools** callable by sub-agents:

```python
# Legal-BERT is now a tool, not the agent itself
@mcp_tool("classify_clauses_bulk")
async def classify_clauses_bulk(clauses: list[str]) -> list[dict]:
    """
    Fast bulk clause classification using Legal-BERT.
    Called by sub-agents when processing many clauses at once
    (more efficient than LLM reasoning per-clause).
    """
    results = []
    for clause in clauses:
        prediction = legal_bert_pipeline(clause)
        results.append({
            "text": clause,
            "type": prediction[0]["label"],
            "confidence": prediction[0]["score"]
        })
    return results
```

This gives the best of both worlds: LLM reasoning for complex analysis, fast ML models for bulk classification.

---

## 6. Pillar 3  MCP Servers

### 6.1 What Is MCP?

The **Model Context Protocol (MCP)** is an open standard (originated by Anthropic) that defines how AI models interact with external tools and data sources. Instead of each agent containing custom HTTP client code, agents call tools by name, and MCP servers handle the implementation.

### 6.2 Why MCP for This System?

Currently, the `integration-service/` uses a custom `BaseIntegration` ABC with `aiohttp` per external system. This means:
- Every new integration requires writing a new Python class
- Auth, rate limiting, and error handling are duplicated per integration
- Agents are tightly coupled to integration implementation details

With MCP:
- Agents call tools by **name** (e.g., `search_case_law`)  they don't know or care about HTTP details
- MCP servers handle auth, rate limiting, retries internally
- New tools can be added by deploying a new MCP server  **zero agent code changes**
- The same MCP servers work with any MCP-compatible client (AI assistants, automation pipelines, etc.)

### 6.3 MCP Server Definitions

#### Legal Database MCP Server

```
Server: legal-database-mcp
Description: Access to compliance rules, jurisdiction data, and regulation texts.
Replaces: compliance-service/rule_engine.py, jurisdiction_manager.py, regulatory_tracker.py

Tools:
  search_regulations:
    description: "Search regulations by keyword, jurisdiction, and topic"
    params: { query: string, jurisdiction: string, topic?: string }
    returns: list of { regulation_id, title, text, jurisdiction, effective_date }

  get_rule_by_id:
    description: "Get a specific compliance rule by ID"
    params: { rule_id: string }
    returns: { id, name, description, jurisdiction, conditions, actions, severity }

  get_jurisdiction_rules:
    description: "Get all active rules for a jurisdiction and document type"
    params: { jurisdiction: string, document_type: string }
    returns: list of ComplianceRule

  track_regulatory_updates:
    description: "Get recent regulatory changes for a jurisdiction"
    params: { jurisdiction: string, since_date: string }
    returns: list of { regulation_id, change_type, old_text, new_text, effective_date }

  evaluate_rule:
    description: "Evaluate a specific rule against a document"
    params: { rule_id: string, document_content: string, context: object }
    returns: { compliant: bool, details: string, severity: string }
```

#### Document Management MCP Server

```
Server: document-management-mcp
Description: Document CRUD, versioning, and format conversion.
Replaces: document-service/app.py, document_processor.py, format_converter.py

Tools:
  create_document:
    params: { title, content, jurisdiction, metadata, owner_id }
    returns: Document

  get_document:
    params: { document_id, version?: int }
    returns: Document

  update_document:
    params: { document_id, content, change_description }
    returns: Document (new version)

  get_version_history:
    params: { document_id }
    returns: list of DocumentVersion

  diff_versions:
    params: { document_id, version_a: int, version_b: int }
    returns: { additions, deletions, changes }

  convert_format:
    params: { content: string, source_format, target_format }
    returns: bytes
```

#### Template MCP Server

```
Server: template-mcp
Description: Legal template management and rendering.
Replaces: template-service/, document_generator.py, template_processor.py

Tools:
  list_templates:
    params: { jurisdiction?: string, document_type?: string }
    returns: list of TemplateSummary

  get_template:
    params: { template_id }
    returns: Template (with variables, sections, inheritance chain)

  render_template:
    params: { template_id, variables: object, sections?: list }
    returns: string (rendered content)

  validate_template_variables:
    params: { template_id, variables: object }
    returns: { valid: bool, missing_vars: list, invalid_vars: list }
```

#### Case Law Research MCP Server

```
Server: case-law-mcp
Description: Legal research  case law search, statute lookup, precedent analysis.
Replaces: integration-service/interfaces/legal_research.py

Tools:
  search_case_law:
    params: { query, jurisdiction?, date_range?, court_level? }
    returns: list of CaseSummary

  get_case_details:
    params: { case_id }
    returns: CaseDetails (full text, ruling, citations)

  search_statutes:
    params: { query, jurisdiction }
    returns: list of StatuteSection

  find_similar_precedents:
    params: { clause_text, jurisdiction }
    returns: list of { case_id, relevance_score, summary }
```

#### E-Signature MCP Server

```
Server: esignature-mcp
Description: Electronic signature management.
Replaces: integration-service/interfaces/esignature.py

Tools:
  create_signature_request:
    params: { document_id, signers: list, options? }
    returns: SignatureRequest

  get_signature_status:
    params: { request_id }
    returns: SignatureStatus

  download_signed_document:
    params: { request_id }
    returns: bytes
```

#### Audit & Security MCP Server

```
Server: audit-security-mcp
Description: Audit logging, access control, encryption.
Replaces: audit-service/, security/*

Tools:
  log_action:
    params: { action, user_id, resource_type, resource_id, changes, metadata }
    returns: AuditRecord

  get_audit_trail:
    params: { resource_id, resource_type, start_time?, end_time? }
    returns: list of AuditRecord

  check_access:
    params: { user_id, document_id, required_level }
    returns: { allowed: bool, reason: string }

  encrypt_document:
    params: { content: bytes, metadata }
    returns: bytes (encrypted)

  decrypt_document:
    params: { encrypted_content: bytes, metadata }
    returns: bytes (decrypted)
```

#### Notification MCP Server

```
Server: notification-mcp
Description: User notifications and alerts.
Replaces: notification-service/

Tools:
  send_notification:
    params: { user_id, type, severity, message, details }
    returns: { notification_id }

  broadcast_alert:
    params: { type, severity, message, details }
    returns: { notification_ids: list }

  request_human_approval:
    params: { user_id, context, question, options, timeout_minutes? }
    returns: { approved: bool, reviewer_id, comments, timestamp }
```

### 6.4 MCP Architecture Diagram

```
Sub-Agents
    
     Tool calls (JSON-RPC over stdio/SSE)
    

           MCP Client Layer              
  (routes tool calls to correct server)  

                        
                        
   Legal Doc  Tpl  Case E-Sig Audit Notify
    DB  Mgmt       Law        Sec
   MCP  MCP  MCP  MCP  MCP   MCP   MCP
```

---

## 7. Pillar 4  RAG Pipeline

### 7.1 Why RAG?

The current system has **no retrieval capability**:
- `RuleEngine` evaluates rules that must be manually coded
- `ContractReviewAgent` classifies clauses but cannot reference similar clauses from prior contracts
- There is no way to search regulations, case law, or the organization's own document history

RAG (Retrieval-Augmented Generation) solves this by letting agents **search** a knowledge base and **ground** their responses in retrieved evidence.

### 7.2 Knowledge Stores

| Store | Content | Use Case | Embedding Model |
|---|---|---|---|
| **Regulation Store** | GDPR articles, CCPA sections, HIPAA rules, employment law by jurisdiction | Compliance checking grounded in actual regulation text | Legal domain embedder |
| **Case Law Store** | Case summaries, rulings, citations | Legal research with precedent citation | Legal domain embedder |
| **Precedent Store** | Prior contract analyses, risk assessments, compliance reports | "How did we handle this last time?" | General embedder |
| **Template Store** | Templates with metadata (jurisdiction, type, variables) | Semantic template search by intent | General embedder |

### 7.3 Implementation Options

**Option A  pgvector (recommended for starting)**:
- Use the existing PostgreSQL database
- Add the `pgvector` extension
- Store embeddings alongside documents in new tables
- Pros: no new infrastructure; transactional consistency with existing data
- Cons: less specialized than dedicated vector DBs

```sql
-- New tables for RAG
CREATE TABLE regulation_embeddings (
    id SERIAL PRIMARY KEY,
    regulation_id INTEGER REFERENCES compliance_rules(id),
    chunk_text TEXT NOT NULL,
    embedding vector(1536) NOT NULL,  -- dimension depends on model
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX ON regulation_embeddings USING ivfflat (embedding vector_cosine_ops);
```

**Option B  Dedicated vector DB (for scale)**:
- Pinecone, Weaviate, or Qdrant
- Better for millions of embeddings with advanced filtering
- Adds operational complexity

### 7.4 RAG Flow

```
Agent needs to check GDPR compliance for a clause
    
    
1. Agent calls tool: search_regulations("data processing consent", "EU-GDPR")
    
    
2. MCP Server embeds query  vector search over regulation_embeddings
    
    
3. Returns top-k regulation chunks with citations:
   - "GDPR Article 6(1)(a): Processing shall be lawful only if..."
   - "GDPR Article 7(1): Where processing is based on consent..."
    
    
4. Agent reasons over retrieved text + the contract clause
    
    
5. Agent produces grounded analysis with specific article citations
```

---

## 8. Pillar 5  Human-in-the-Loop Approval Gates

### 8.1 Why?

Legal work carries real-world consequences. The current system has **no human checkpoints**  an AI-generated compliance report goes directly to the user with no lawyer review. This is a liability risk.

### 8.2 Approval Gate Design

The Supervisor Agent has access to a `request_human_approval` tool that:
1. Pauses agent execution
2. Sends a structured approval request to the designated reviewer(s) via the existing WebSocket notification system
3. Waits for a response (with configurable timeout)
4. Resumes execution with the human's decision

### 8.3 When to Require Approval

| Trigger | Threshold | Escalation |
|---|---|---|
| High-risk finding | Risk score > 0.7 | Pause and require lawyer review |
| Compliance violation | Critical or High severity | Pause and require compliance officer review |
| Document finalization | Any document marked "final" | Require owner sign-off |
| E-signature dispatch | Always | Require sender confirmation |
| Cross-border matters | Documents touching > 2 jurisdictions | Require senior counsel review |
| AI uncertainty | LLM confidence below threshold | Flag for human review |

### 8.4 Implementation

```python
# Tool available to the Supervisor Agent
@mcp_tool("request_human_approval")
async def request_human_approval(
    reviewer_ids: list[str],
    context: str,          # Summary of what the agent found
    question: str,         # What the agent needs decided
    options: list[str],    # e.g., ["Approve", "Reject", "Revise"]
    supporting_docs: list[str],  # Document IDs for review
    timeout_minutes: int = 60
) -> dict:
    """
    Sends an approval request via WebSocket to designated reviewers.
    Pauses agent execution until a response is received or timeout.
    Uses the existing NotificationManager infrastructure.
    """
    notification = await notification_manager.send_notification(
        user_ids=reviewer_ids,
        type=NotificationType.APPROVAL_REQUEST,
        severity="high",
        message=question,
        details={
            "context": context,
            "options": options,
            "supporting_docs": supporting_docs,
            "agent_session_id": current_session_id
        }
    )

    # Wait for response (WebSocket callback)
    response = await approval_queue.wait(
        notification_id=notification.id,
        timeout=timedelta(minutes=timeout_minutes)
    )

    return {
        "approved": response.decision == "Approve",
        "decision": response.decision,
        "reviewer_id": response.user_id,
        "comments": response.comments,
        "timestamp": response.timestamp.isoformat()
    }
```

### 8.5 Frontend Integration

The existing `NotificationCenter.tsx` (MUI WebSocket component) is extended with an **approval card** that renders:
- Agent's summary and findings
- The specific question being asked
- Action buttons (Approve / Reject / Request Revision)
- A comments text field
- Links to relevant documents

---

## 9. Pillar 6  Evaluation, Guardrails & Observability

### 9.1 Output Guardrails

Every agent response passes through a validation layer before reaching the user:

| Guardrail | Check | Action on Failure |
|---|---|---|
| **Citation verification** | Every legal claim must reference a retrievable regulation or case | Block response; ask agent to add citations |
| **Jurisdiction consistency** | Advice must match the document's specified jurisdiction | Flag mismatch; ask agent to correct |
| **PII detection** | No unmasked PII in agent responses or logs | Mask using existing `PrivacyManager` |
| **Confidence scoring** | Agent must express uncertainty when appropriate | Add confidence disclaimers |
| **Hallucination check** | Cross-reference key claims against RAG-retrieved sources | Flag unsupported claims |

### 9.2 Evaluator Agent (optional)

A separate agent that reviews the primary agent's output:

```python
EVALUATOR_SYSTEM_PROMPT = """
You are a quality assurance reviewer for legal AI outputs.
Check the following output for:
1. Factual accuracy  are cited regulations real and correctly quoted?
2. Completeness  are all relevant jurisdictions and regulations covered?
3. Safety  could any statement be construed as legal advice without proper caveats?
4. Consistency  does the analysis contradict itself?
5. Citations  is every claim supported by a specific reference?

Score the output on a 1-5 scale for each criterion and explain any issues found.
"""
```

### 9.3 Observability

Extend the existing audit infrastructure with AI-specific tracing:

| Metric | Source | Purpose |
|---|---|---|
| Token usage per task | LLM API responses | Cost tracking and budgeting |
| Tool call success/failure rates | MCP server responses | Reliability monitoring |
| Agent iteration count | Supervisor loop counter | Detect runaway loops |
| Human override frequency | Approval gate responses | Measure AI accuracy over time |
| Latency per agent step | Performance monitor | Identify bottlenecks |
| RAG retrieval relevance | User feedback + click-through | Improve retrieval quality |
| Hallucination detection rate | Evaluator agent output | Track AI reliability |

```python
# Enhanced audit record for AI operations
class AIAuditRecord(AuditRecord):
    """Extends existing AuditRecord with AI-specific fields."""
    agent_name: str
    model_used: str
    token_count: dict          # {"input": N, "output": N}
    tool_calls: list[dict]     # [{name, params, result_summary, latency_ms}]
    iteration_count: int
    confidence_score: float
    citations: list[str]
    human_override: bool
    evaluator_score: dict      # {accuracy: N, completeness: N, ...}
```

---

## 10. Migration Mapping: Existing Code  New Architecture

| Existing Component | File(s) | New Role | Change Type |
|---|---|---|---|
| `AIOrchestrator` | `orchestrator.py` | **Replaced** by Supervisor Agent | Rewrite |
| `BaseAgent` | `base_agent.py` | **Evolved**  wraps LLM + tools instead of model calls | Refactor |
| `ContractReviewAgent` | `contract_review_agent.py` | **Replaced** by Contract Review Sub-Agent; Legal-BERT retained as tool | Rewrite |
| `RuleEngine` | `rule_engine.py` | **Wrapped** in Legal Database MCP Server | Wrap |
| `JurisdictionManager` | `jurisdiction_manager.py` | **Wrapped** in Legal Database MCP Server | Wrap |
| `RegulatoryTracker` | `regulatory_tracker.py` | **Wrapped** in Legal Database MCP Server | Wrap |
| `ComplianceChecker` | `compliance_checker.py` | **Logic moves** to Compliance Sub-Agent + Legal DB MCP | Split |
| `DocumentProcessor` | `document_processor.py` | **Wrapped** in Document Management MCP Server | Wrap |
| `DocumentGenerator` | `document_generator.py` | **Wrapped** in Template MCP Server | Wrap |
| `TemplateProcessor` | `template_processor.py` | **Wrapped** in Template MCP Server | Wrap |
| `NLPProcessor` | `nlp_processor.py` | **Replaced** by LLM reasoning + RAG retrieval | Retire |
| `FormatConverter` | `format_converter.py` | **Wrapped** in Document Management MCP Server | Wrap |
| `IntegrationManager` | `integration_manager.py` | **Replaced** by MCP client layer | Retire |
| `BaseIntegration` | `base_integration.py` | **Pattern absorbed** into MCP server template | Retire |
| `LegalResearchIntegration` | `legal_research.py` | **Becomes** Case Law MCP Server | Rewrite |
| `ESignatureIntegration` | `esignature.py` | **Becomes** E-Signature MCP Server | Rewrite |
| `DocumentManagementIntegration` | `document_management.py` | **Becomes** Document Management MCP Server | Rewrite |
| `EncryptionService` | `encryption.py` | **Preserved**  exposed via Audit & Security MCP | Keep |
| `DocumentAccessManager` | `access_control.py` | **Preserved**  exposed via Audit & Security MCP | Keep |
| `AuthenticationManager` | `authentication.py` | **Preserved**  used by API gateway and MCP servers | Keep |
| `AuthorizationManager` | `authorization.py` | **Preserved**  used by MCP servers for access checks | Keep |
| `SessionManager` | `session_manager.py` | **Preserved**  unchanged | Keep |
| `NotificationManager` | `notification_manager.py` | **Enhanced**  adds approval gate support | Extend |
| `ActivityMonitor` | `activity_monitor.py` | **Enhanced**  adds AI-specific metrics | Extend |
| `PrivacyManager` | `privacy_manager.py` | **Preserved**  used by guardrails layer | Keep |
| SQLAlchemy models | `models/*.py` | **Extended**  add embedding tables for RAG | Extend |
| `DocumentEditor.tsx` | Frontend | **Extended**  add AI chat panel | Extend |
| `NotificationCenter.tsx` | Frontend | **Extended**  add approval card | Extend |
| `AuthContext.tsx` | Frontend | **Preserved**  unchanged | Keep |

---

## 11. Technology Choices

### 11.1 LLM Provider

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| **Claude (Anthropic)** | Best reasoning, native tool-use, MCP originator, large context window | API cost | **Primary choice** |
| **GPT-4 (OpenAI)** | Strong reasoning, function calling | No native MCP | Secondary/fallback |
| **Llama 3 (local)** | Privacy, no API cost | Weaker reasoning, infrastructure overhead | Specialized bulk tasks only |

**Recommendation**: Use Claude as the primary reasoning engine via the Anthropic API. Abstract behind a provider interface so the LLM can be swapped. Retain Legal-BERT for fast, specialized classification tasks.

### 11.2 MCP Implementation

- **Transport**: stdio for local MCP servers, SSE (Server-Sent Events) for remote
- **Framework**: Use the official `mcp` Python SDK for server implementation
- **Auth**: MCP servers validate JWT tokens from the existing auth system

### 11.3 Vector Database (RAG)

- **Phase 1**: pgvector on existing PostgreSQL (no new infra)
- **Phase 2**: Migrate to dedicated vector DB (Qdrant/Weaviate) if scale demands it

### 11.4 Embedding Model

- **Primary**: Anthropic's embedding API or OpenAI `text-embedding-3-large`
- **Alternative**: Local embeddings via `sentence-transformers` for privacy-sensitive data

---

## 12. Phased Migration Plan

### Phase 1  MCP Foundation (weeks 1-3)

**Goal**: Wrap existing services as MCP servers without changing agent logic.

- [ ] Set up MCP server template (FastAPI + `mcp` SDK)
- [ ] Wrap `compliance-service/` as Legal Database MCP Server
- [ ] Wrap `document-service/` as Document Management MCP Server
- [ ] Wrap `template-service/` as Template MCP Server
- [ ] Wrap `audit-service/` + `security/` as Audit & Security MCP Server
- [ ] Wrap `notification-service/` as Notification MCP Server
- [ ] Existing `AIOrchestrator` continues to work  agents now call MCP tools instead of direct imports

**Outcome**: All backend capabilities accessible via standard MCP protocol. Zero agent changes yet.

### Phase 2  RAG Pipeline (weeks 3-5)

**Goal**: Add retrieval capability.

- [ ] Add pgvector extension to PostgreSQL
- [ ] Create embedding tables (`regulation_embeddings`, `case_law_embeddings`, `precedent_embeddings`)
- [ ] Build ingestion pipeline (embed regulations, case law, prior analyses)
- [ ] Add `search_regulations` and `find_similar_precedents` tools to MCP servers
- [ ] Test retrieval quality with sample queries

**Outcome**: Agents can search regulations and precedents via tool calls.

### Phase 3  Supervisor Agent (weeks 5-8)

**Goal**: Replace `AIOrchestrator` with LLM-powered Supervisor Agent.

- [ ] Implement `SupervisorAgent` class with Claude API integration
- [ ] Define supervisor system prompt and tool definitions
- [ ] Route existing task types through supervisor (backward compatible)
- [ ] Add conversational interface (multi-turn chat)
- [ ] Integration test: supervisor handles contract_analysis workflow end-to-end

**Outcome**: Dynamic, LLM-driven orchestration replaces static workflow dict.

### Phase 4  Sub-Agent Migration (weeks 8-12)

**Goal**: Migrate agents one-by-one to LLM-powered sub-agents.

- [ ] Migrate Contract Review Agent (retain Legal-BERT as tool)
- [ ] Migrate Compliance Agent
- [ ] Migrate Legal Research Agent
- [ ] Migrate Drafting Agent
- [ ] Migrate Risk Assessment Agent
- [ ] Retire `NLPProcessor` (replaced by LLM + RAG)

**Outcome**: All agents are LLM-powered with tool-use.

### Phase 5  Human-in-the-Loop & Guardrails (weeks 12-14)

**Goal**: Add safety layers.

- [ ] Implement `request_human_approval` MCP tool
- [ ] Extend `NotificationCenter.tsx` with approval cards
- [ ] Implement output guardrails (citation check, PII detection, jurisdiction consistency)
- [ ] Add AI observability metrics to audit system
- [ ] Optional: implement Evaluator Agent

**Outcome**: Production-ready system with human oversight and safety guarantees.

### Phase 6  Frontend Enhancement (weeks 14-16)

**Goal**: Full conversational UI.

- [ ] Add chat panel to `DocumentEditor.tsx` for interacting with agents
- [ ] Add approval workflow UI
- [ ] Add agent reasoning trace viewer (optional, for power users)
- [ ] Add compliance dashboard with AI-generated insights

**Outcome**: Users can converse with the AI, ask follow-ups, and review agent reasoning.

---

## 13. Cost & Performance Considerations

### 13.1 Cost Management

Agentic LLM loops can be expensive. Mitigation strategies:

| Strategy | Implementation |
|---|---|
| **Token budgets** | Set max_tokens per task type; Supervisor Agent has a "budget" tool that tracks spend |
| **Caching** | Cache common regulation lookups and template renders in Redis |
| **Tiered models** | Use Claude for complex reasoning; use smaller/cheaper models for routine classification |
| **Batch processing** | Group bulk document reviews into single LLM calls where possible |
| **RAG pre-filtering** | Use vector search to narrow scope before sending to LLM |

### 13.2 Latency

| Operation | Current | Expected (Agentic) | Mitigation |
|---|---|---|---|
| Single clause classification | ~50ms (Legal-BERT) | ~500ms (LLM) | Keep Legal-BERT as bulk tool |
| Full contract review | ~2-5s | ~15-30s (multi-step) | Stream intermediate results |
| Compliance check | ~200ms (rule engine) | ~3-5s (LLM + RAG) | Cache frequent jurisdiction rules |
| Document generation | ~1-2s | ~5-10s (LLM drafting) | Use templates for standard docs |

### 13.3 Reliability

- **Retry logic**: Supervisor Agent retries failed sub-agent calls (up to 3 times)
- **Fallback**: If LLM API is unavailable, fall back to existing Legal-BERT pipeline
- **Circuit breaker**: If a MCP server is unresponsive, skip that tool and note it in the output
- **Timeout**: Each agent step has a configurable timeout (default 60s)

---

## 14. Appendix  Sequence Diagrams

### 14.1 Contract Review Flow (Proposed)

```
User                Supervisor          Contract         Compliance      Legal DB      Human
                     Agent            Review Agent       Agent          MCP Server    Reviewer
                                                                                    
   "Review this NDA"                                                                
  >                                                              
                                                                                    
                       [Plan: extract                                              
                        review  comply                                            
                        approve]                                                    
                                                                                    
                       delegate_review()                                            
                      >                                          
                                                                                    
                                           search_regs()                            
                                          >            
                                          < regulations             
                                                                                    
                                           classify_bulk()                          
                                          > Legal-BERT                            
                                          < clauses                               
                                                                                    
                      < review results                                           
                                                                                    
                       delegate_compliance()                                         
                      >                           
                                                          get_rules()               
                                                         >            
                                                         < rules             
                      < compliance results                            
                                                                                    
                       [Risk score = 0.8 > threshold]                               
                                                                                    
                       request_human_approval()                                      
                      >
                                                                          Approve   
                      < 
                                                                                    
  < Final report                                                               
    (with citations)                                                               
```

### 14.2 Iterative Compliance Fix Flow (New Capability)

```
Supervisor          Compliance          Drafting            Legal DB
  Agent               Agent              Agent             MCP Server
                                                            
    check_compliance()                                      
   >                                     
                        get_rules()                         
                       >
                       < rules 
                                                            
   < VIOLATION: missing data retention clause  
                                                            
    [Decides to fix automatically]                           
                                                            
    suggest_revision()                                      
   >                   
                                          search_precedent()
                                         >
                                         < examples 
                                                            
   < revised clause with data retention language 
                                                            
    re-check_compliance()                                    
   >                                     
   < COMPLIANT                                      
                                                            
    [Return: original issue + auto-fix + verification]       
```

---

*This design document is a living artifact. Update it as architectural decisions are made and implementation progresses.*
