"""
Integration Service  FastAPI application entry point.

This stub exposes health endpoints. Integration Manager, Legal Research,
E-Signature, and Document Management integrations will be wired in as
MCP Servers per the AI_AGENT_DESIGN.md plan.
"""
from fastapi import FastAPI

app = FastAPI(
    title="Integration Service",
    description="External system integrations: DMS, e-signature, legal research",
    version="0.1.0",
)


@app.get("/healthz", tags=["ops"])
async def healthz():
    return {"status": "ok"}


@app.get("/readyz", tags=["ops"])
async def readyz():
    return {"status": "ready"}


@app.get("/", tags=["ops"])
async def root():
    return {"service": "integration-service", "version": "0.1.0"}
