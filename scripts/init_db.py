#!/usr/bin/env python3
"""
Database table initializer.

Connects to PostgreSQL and creates all SQLAlchemy-defined tables.
Run once after the database container is healthy.

Usage:
    python scripts/init_db.py
"""
import asyncio
import os
import sys

# Ensure /app is on the path when running inside container
sys.path.insert(0, '/app')

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = os.environ.get(
    'DATABASE_URL',
    'postgresql+asyncpg://postgres:postgres@localhost:5432/legal_automation'
)


async def init_db() -> None:
    print(f"Connecting to: {DATABASE_URL.split('@')[-1]}")  # hide credentials

    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        # Import models so Base.metadata is populated
        from backend.models.base import Base
        from backend.models import (  # noqa: F401
            document, user, compliance, audit, template, ai_config
        )

        # Create all tables (idempotent  skips existing tables)
        await conn.run_sync(Base.metadata.create_all)
        print("  All SQLAlchemy tables created (or already exist)")

        # Create RAG embedding tables
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS regulation_embeddings (
                id SERIAL PRIMARY KEY,
                regulation_id INTEGER,
                chunk_text TEXT NOT NULL,
                embedding vector(1536),
                metadata JSONB DEFAULT '{}'
            )
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_reg_embed
            ON regulation_embeddings
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100)
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS document_embeddings (
                id SERIAL PRIMARY KEY,
                document_id INTEGER,
                chunk_text TEXT NOT NULL,
                embedding vector(1536),
                metadata JSONB DEFAULT '{}'
            )
        """))
        print("  RAG embedding tables created")

    await engine.dispose()
    print("Database initialization complete.")


if __name__ == '__main__':
    asyncio.run(init_db())
