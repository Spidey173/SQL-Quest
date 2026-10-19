from typing import AsyncGenerator
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings

# Adjust postgres scheme if needed for async driver
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://") or db_url.startswith("postgres://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1).replace("postgres://", "postgresql+asyncpg://", 1)
    if "?" in db_url:
        base_part = db_url.split("?")[0]
        db_url = f"{base_part}?ssl=require"
    else:
        db_url = f"{db_url}?ssl=require"
elif db_url.startswith("sqlite:///"):
    db_url = db_url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)

is_postgres = "postgresql" in db_url

# Neon pooler (PgBouncer) REQUIRES statement_cache_size=0 because PgBouncer
# transaction mode doesn't support asyncpg prepared statement caching.
# If you switch to a direct (non-pooler) Neon URL, you can remove this.
is_neon_pooler = "pooler" in db_url
connect_args = (
    {"statement_cache_size": 0} if (is_postgres and is_neon_pooler) else
    ({} if is_postgres else ({"check_same_thread": False} if "sqlite" in db_url else {}))
)

engine_kwargs = {
    "echo": False,
    "future": True,
    "connect_args": connect_args,
}

if is_postgres:
    engine_kwargs.update({
        # CRITICAL for Neon: pre_ping detects stale connections after cold start
        "pool_pre_ping": True,
        # Recycle connections every 10 minutes (Neon keeps idle connections ~5 min)
        "pool_recycle": 600,
        # Neon free tier supports ~5 concurrent connections — keep pool small
        "pool_size": 3,
        # Allow up to 5 overflow connections for burst traffic
        "max_overflow": 5,
        # Don't wait forever for a connection from the pool
        "pool_timeout": 30,
    })

engine = create_async_engine(db_url, **engine_kwargs)

if "sqlite" in db_url:
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.close()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
