import os
import sys

# Ensure backend directory is in path and default to fast local SQLite for tests
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_ci.db")

import pytest
import pytest_asyncio
from app.database import AsyncSessionLocal, engine, Base
from app.models import Challenge
from app.seed_data import seed_database
from sqlalchemy import select, func

@pytest_asyncio.fixture(autouse=True, scope="session")
async def setup_test_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        count = (await session.execute(select(func.count(Challenge.id)))).scalar() or 0
        if count == 0:
            await seed_database()
    yield
    await engine.dispose()
