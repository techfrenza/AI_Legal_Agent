# AI Orchestrator  Build context: repository root
# NOTE: First build downloads the spaCy en_core_web_lg model (~700 MB).
#       Total image size is approximately 3-4 GB.
#       For faster local builds, comment out the spaCy download line and
#       set USE_MOCK_NLP=true in .env to skip model loading at runtime.
FROM python:3.11-slim

RUN groupadd -r appuser && useradd -r -g appuser appuser
WORKDIR /app

# build-essential required to compile native extensions (numpy, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/ai-orchestrator/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Download spaCy model at build time so it is cached in the layer
RUN python -m spacy download en_core_web_lg

COPY backend/__init__.py          ./backend/__init__.py
COPY backend/common/              ./backend/common/
COPY backend/models/              ./backend/models/
COPY backend/security/            ./backend/security/
COPY backend/ai-orchestrator/     ./backend/ai_orchestrator/

ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

USER appuser
EXPOSE 8000
CMD ["uvicorn", "backend.ai_orchestrator.app:app", "--host", "0.0.0.0", "--port", "8000"]
