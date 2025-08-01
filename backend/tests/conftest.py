import os
from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.main import app
from app.models.user import User

# Test database URL - use environment variable or default
TEST_DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost/scribe_test"
).replace("postgresql://", "postgresql+asyncpg://")


@pytest_asyncio.fixture
async def test_db_engine():
    """Create test database engine"""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop all tables after tests
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Get test database session with automatic rollback"""
    async_session_maker = async_sessionmaker(
        test_db_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session_maker() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Get test client with database override"""

    # Override the get_db dependency to use our test session
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

    # Clear overrides after test
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def authenticated_client(
    client: AsyncClient,
) -> AsyncGenerator[AsyncClient, None]:
    """Get authenticated test client"""
    # Create a test user
    user_data = {
        "email": "test@example.com",
        "password": "testpass123",
        "full_name": "Test User",
    }

    # Register user
    response = await client.post("/api/auth/register", json=user_data)
    assert response.status_code == 200

    # Login to get token
    login_data = {"username": user_data["email"], "password": user_data["password"]}
    response = await client.post("/api/auth/login", data=login_data)
    assert response.status_code == 200

    token = response.json()["access_token"]

    # Set authorization header
    client.headers["Authorization"] = f"Bearer {token}"

    yield client


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user in the database"""
    from app.core.security import get_password_hash
    from app.models.user import User

    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("testpass123"),
        full_name="Test User",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user
