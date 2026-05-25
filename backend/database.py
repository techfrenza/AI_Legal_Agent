from sqlmodel import create_engine, SQLModel, Session
from dotenv import load_dotenv
import os

load_dotenv()

DB_BACKEND = os.getenv("DB_BACKEND", "sqlite").lower()

if DB_BACKEND == "supabase":
    # Transaction-mode pooler URL required for serverless (Vercel) deployments.
    # Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        raise RuntimeError(
            "DB_BACKEND=supabase requires DATABASE_URL to be set as a PostgreSQL connection string."
        )
    engine = create_engine(DATABASE_URL)
else:
    # Default: SQLite (local development / CI)
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./legal_agent.db")
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def create_db():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
