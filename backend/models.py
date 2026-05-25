from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class Document(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    content: str
    jurisdiction: str = "US"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AnalysisResult(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    document_id: int = Field(foreign_key="document.id")
    analysis_type: str  # "contract_review" | "compliance_check"
    result_json: str    # JSON-serialised Claude output
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Template(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    jurisdiction: str = "US"
    content: str        # markdown with {{variable}} placeholders
    created_at: datetime = Field(default_factory=datetime.utcnow)
