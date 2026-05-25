import re
from datetime import datetime
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from database import get_session
from models import Template, Document
from ai_client import call_claude
from deps import require_api_key

router = APIRouter(dependencies=[Depends(require_api_key)])

_PLACEHOLDER_RE = re.compile(r"\{\{(\w+)\}\}")

_ENHANCE_SYSTEM = """You are a professional legal document writer. The user has generated a legal document from a template.
Review it for clarity, completeness, and professional tone. Return ONLY the improved document text — no commentary."""


class TemplateCreate(BaseModel):
    name: str
    jurisdiction: str = "US"
    content: str


class GenerateRequest(BaseModel):
    variables: dict[str, str]
    title: str
    enhance_with_ai: bool = False


@router.get("/")
def list_templates(session: Annotated[Session, Depends(get_session)]):
    return session.exec(select(Template).order_by(Template.name)).all()


@router.post("/", status_code=201)
def create_template(body: TemplateCreate, session: Annotated[Session, Depends(get_session)]):
    tmpl = Template(**body.model_dump())
    session.add(tmpl)
    session.commit()
    session.refresh(tmpl)
    return tmpl


@router.get("/{tmpl_id}")
def get_template(tmpl_id: int, session: Annotated[Session, Depends(get_session)]):
    tmpl = session.get(Template, tmpl_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tmpl


@router.get("/{tmpl_id}/variables")
def get_template_variables(tmpl_id: int, session: Annotated[Session, Depends(get_session)]):
    tmpl = session.get(Template, tmpl_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    variables = sorted(set(_PLACEHOLDER_RE.findall(tmpl.content)))
    return {"variables": variables}


@router.post("/{tmpl_id}/generate", status_code=201)
def generate_document(
    tmpl_id: int,
    body: GenerateRequest,
    session: Annotated[Session, Depends(get_session)],
):
    tmpl = session.get(Template, tmpl_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")

    content = tmpl.content
    for key, value in body.variables.items():
        content = content.replace(f"{{{{{key}}}}}", value)

    # Warn about any unfilled placeholders
    unfilled = _PLACEHOLDER_RE.findall(content)
    if unfilled:
        raise HTTPException(
            status_code=422,
            detail=f"Missing variables: {', '.join(sorted(set(unfilled)))}",
        )

    if body.enhance_with_ai:
        content = call_claude(system=_ENHANCE_SYSTEM, user=content)

    doc = Document(
        title=body.title,
        content=content,
        jurisdiction=tmpl.jurisdiction,
        updated_at=datetime.utcnow(),
    )
    session.add(doc)
    session.commit()
    session.refresh(doc)
    return doc


@router.delete("/{tmpl_id}", status_code=204)
def delete_template(tmpl_id: int, session: Annotated[Session, Depends(get_session)]):
    tmpl = session.get(Template, tmpl_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    session.delete(tmpl)
    session.commit()
