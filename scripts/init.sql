-- =============================================================================
-- AI Legal Agent  PostgreSQL Initialization
-- Runs automatically at first postgres container startup.
-- =============================================================================

-- Enable pgvector for RAG embeddings (requires pgvector/pgvector image)
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_trgm for fuzzy text search on regulation/clause content
CREATE EXTENSION IF NOT EXISTS pg_trgm;
