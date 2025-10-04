from fastapi import FastAPI, HTTPException, Security
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime

app = FastAPI()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class Document(BaseModel):
    id: str
    title: str
    content: str
    version: int
    jurisdiction: str
    created_at: datetime
    updated_at: datetime
    created_by: str
    metadata: dict

class DocumentService:
    def __init__(self):
        self.version_history = {}
        
    async def create_document(self, doc_data: dict) -> Document:
        doc_id = str(uuid.uuid4())
        document = Document(
            id=doc_id,
            version=1,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            **doc_data
        )
        self.version_history[doc_id] = [document]
        return document
    
    async def update_document(self, doc_id: str, updates: dict) -> Document:
        if doc_id not in self.version_history:
            raise HTTPException(status_code=404, detail="Document not found")
            
        current_doc = self.version_history[doc_id][-1]
        new_version = Document(
            **current_doc.dict(),
            **updates,
            version=current_doc.version + 1,
            updated_at=datetime.now()
        )
        self.version_history[doc_id].append(new_version)
        return new_version

document_service = DocumentService()

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/readyz")
async def readyz():
    # In real world, check DB/cache readiness. Here, return ok.
    return {"status": "ready"}

@app.post("/documents/", response_model=Document)
async def create_document(doc_data: dict, token: str = Security(oauth2_scheme)):
    return await document_service.create_document(doc_data)

@app.put("/documents/{doc_id}", response_model=Document)
async def update_document(doc_id: str, updates: dict, token: str = Security(oauth2_scheme)):
    return await document_service.update_document(doc_id, updates) 