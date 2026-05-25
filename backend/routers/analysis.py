import json
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from database import get_session
from models import Document, AnalysisResult
from ai_client import call_claude
from routers.notifications import notify_all
from deps import require_api_key

router = APIRouter(dependencies=[Depends(require_api_key)])

_CONTRACT_SYSTEM = """You are an expert legal analyst. Analyse the provided contract and return ONLY valid JSON (no markdown fences) in this exact schema:
{
  "clauses": [
    {"title": "string", "type": "string", "text": "string", "risk_level": "low|medium|high"}
  ],
  "risks": [
    {"description": "string", "severity": "low|medium|high", "clause_title": "string"}
  ],
  "risk_score": <integer 0-10>,
  "summary": "string",
  "recommendations": ["string"]
}"""

_COMPLIANCE_SYSTEM = """You are a legal compliance expert. Analyse the provided document against the listed regulations and return ONLY valid JSON (no markdown fences) in this exact schema:
{
  "regulations": {
    "<REGULATION_NAME>": {
      "pass": <true|false>,
      "issues": ["string"],
      "recommendations": ["string"]
    }
  },
  "overall_pass": <true|false>,
  "summary": "string"
}"""


class ComplianceRequest(BaseModel):
    regulations: list[str] = ["GDPR", "HIPAA", "CCPA"]


def _get_doc_or_404(doc_id: int, session: Session) -> Document:
    doc = session.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


def _save_result(doc_id: int, analysis_type: str, result: dict, session: Session) -> AnalysisResult:
    ar = AnalysisResult(
        document_id=doc_id,
        analysis_type=analysis_type,
        result_json=json.dumps(result),
    )
    session.add(ar)
    session.commit()
    session.refresh(ar)
    return ar


@router.post("/contract/{doc_id}")
async def analyse_contract(
    doc_id: int,
    session: Annotated[Session, Depends(get_session)],
):
    doc = _get_doc_or_404(doc_id, session)
    raw = call_claude(
        system=_CONTRACT_SYSTEM,
        user=f"Jurisdiction: {doc.jurisdiction}\n\nDocument title: {doc.title}\n\n{doc.content}",
    )
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail=f"AI returned non-JSON: {raw[:200]}")

    ar = _save_result(doc_id, "contract_review", result, session)
    await notify_all({
        "type": "analysis_complete",
        "analysis_type": "contract_review",
        "document_id": doc_id,
        "document_title": doc.title,
        "risk_score": result.get("risk_score"),
    })
    return {"analysis_id": ar.id, **result}


@router.post("/compliance/{doc_id}")
async def check_compliance(
    doc_id: int,
    body: ComplianceRequest,
    session: Annotated[Session, Depends(get_session)],
):
    doc = _get_doc_or_404(doc_id, session)
    regulations_list = ", ".join(body.regulations)
    raw = call_claude(
        system=_COMPLIANCE_SYSTEM,
        user=f"Regulations to check: {regulations_list}\nJurisdiction: {doc.jurisdiction}\n\nDocument title: {doc.title}\n\n{doc.content}",
    )
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail=f"AI returned non-JSON: {raw[:200]}")

    ar = _save_result(doc_id, "compliance_check", result, session)
    if not result.get("overall_pass", True):
        await notify_all({
            "type": "compliance_violation",
            "document_id": doc_id,
            "document_title": doc.title,
            "regulations": [r for r, v in result.get("regulations", {}).items() if not v.get("pass")],
        })
    return {"analysis_id": ar.id, **result}


@router.get("/history/{doc_id}")
def get_analysis_history(
    doc_id: int,
    session: Annotated[Session, Depends(get_session)],
):
    results = session.exec(
        select(AnalysisResult)
        .where(AnalysisResult.document_id == doc_id)
        .order_by(AnalysisResult.created_at.desc())
    ).all()
    return [{"id": r.id, "analysis_type": r.analysis_type, "created_at": r.created_at,
             "result": json.loads(r.result_json)} for r in results]
