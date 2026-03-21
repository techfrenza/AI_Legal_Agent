# Document Service
# Build context: repository root
FROM python:3.11-slim
RUN groupadd -r appuser && useradd -r -g appuser appuser
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY backend/document-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt
COPY backend/__init__.py ./backend/__init__.py
COPY backend/common/ ./backend/common/
COPY backend/models/ ./backend/models/
COPY backend/security/ ./backend/security/
COPY backend/document-service/ ./backend/document_service/
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
USER appuser
EXPOSE 8000
CMD ["uvicorn", "backend.document_service.app:app", "--host", "0.0.0.0", "--port", "8000"]
