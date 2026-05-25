from datetime import datetime
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from database import get_session
from models import Document
from deps import require_api_key

router = APIRouter(dependencies=[Depends(require_api_key)])


class DocumentCreate(BaseModel):
    title: str
    content: str
    jurisdiction: str = "US"


class DocumentUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    jurisdiction: str | None = None


@router.get("/")
def list_documents(session: Annotated[Session, Depends(get_session)]):
    return session.exec(select(Document).order_by(Document.updated_at.desc())).all()


@router.post("/", status_code=201)
def create_document(
    body: DocumentCreate,
    session: Annotated[Session, Depends(get_session)],
):
    doc = Document(**body.model_dump())
    session.add(doc)
    session.commit()
    session.refresh(doc)
    return doc


@router.get("/{doc_id}")
def get_document(doc_id: int, session: Annotated[Session, Depends(get_session)]):
    doc = session.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.put("/{doc_id}")
def update_document(
    doc_id: int,
    body: DocumentUpdate,
    session: Annotated[Session, Depends(get_session)],
):
    doc = session.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(doc, field, value)
    doc.updated_at = datetime.utcnow()
    session.add(doc)
    session.commit()
    session.refresh(doc)
    return doc


@router.delete("/{doc_id}", status_code=204)
def delete_document(doc_id: int, session: Annotated[Session, Depends(get_session)]):
    doc = session.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    session.delete(doc)
    session.commit()
