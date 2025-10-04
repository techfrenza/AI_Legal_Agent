from fastapi import FastAPI
import os

app = FastAPI(title="API Gateway")


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/readyz")
async def readyz():
    # In a fuller implementation, check downstream services
    return {"status": "ready"}


@app.get("/")
async def root():
    return {"service": "api-gateway"}


