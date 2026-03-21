"""
Compliance Service  FastAPI application entry point.

This stub exposes health endpoints and will be expanded as the
compliance engine (RuleEngine, JurisdictionManager, ComplianceChecker)
is wired into HTTP routes per the AI_AGENT_DESIGN.md plan.
"""
from fastapi import FastAPI

app = FastAPI(
    title="Compliance Service",
    description="Multi-jurisdiction compliance checking and regulatory tracking",
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
    return {"service": "compliance-service", "version": "0.1.0"}
