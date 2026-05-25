import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import create_db
from routers import documents, analysis, templates, notifications

load_dotenv()

app = FastAPI(title="AI Legal Agent MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(documents.router, prefix="/documents", tags=["documents"])
app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
app.include_router(templates.router, prefix="/templates", tags=["templates"])
app.include_router(notifications.router, tags=["notifications"])


@app.on_event("startup")
def on_startup():
    create_db()


@app.get("/health")
def health():
    return {"status": "ok"}
