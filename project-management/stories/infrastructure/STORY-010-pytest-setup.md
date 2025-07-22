# STORY-010: Pytest Infrastructure Setup

**Epic**: [EPIC-001](../../epics/EPIC-001-tdd-implementation.md)
**Priority**: 🚨 CRITICAL
**Points**: 5
**Sprint**: 1 (First task!)
**Status**: ✅ COMPLETED
**Completed**: July 20, 2025

## User Story

AS A developer wanting to write tests
I WANT a properly configured pytest environment
SO THAT I can write async tests for FastAPI endpoints

## Context

We have an empty `/backend/tests/` directory. We need full pytest setup with async support, database fixtures, and FastAPI test client before anyone can write tests.

## Acceptance Criteria

- [x] Pytest installed with async support
- [x] Test database configuration separate from dev
- [x] FastAPI test client configured
- [x] Basic fixtures for users, documents, reflections
- [x] Test utilities for common operations
- [x] Example test demonstrating setup
- [x] Test runner configuration (pytest.ini)

## Technical Tasks

### Task 1: Install test dependencies

```bash
# Add to requirements.txt or create requirements-test.txt
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
httpx==0.25.2  # For async test client
factory-boy==3.3.0  # For test data
faker==20.1.0  # For realistic test data
```

### Task 2: Configure pytest

```ini
# backend/pytest.ini
[tool:pytest]
minversion = 7.0
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
asyncio_mode = auto
addopts =
    --verbose
    --cov=app
    --cov-report=term-missing
    --cov-report=html
    --cov-fail-under=80
```

### Task 3: Create test database configuration

```python
# backend/tests/conftest.py
import pytest
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from httpx import AsyncClient

from app.core.database import Base, get_db
from app.main import app

# Test database URL
TEST_DATABASE_URL = "postgresql+asyncpg://test_user:test_pass@localhost/scribe_test"

@pytest.fixture(scope="session")
async def test_db_engine():
    """Create test database engine"""
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db_session(test_db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Get test database session"""
    async with AsyncSession(test_db_engine) as session:
        yield session
        await session.rollback()

@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Get test client with database override"""
    app.dependency_overrides[get_db] = lambda: db_session
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
```

### Task 4: Create test factories

```python
# backend/tests/factories.py
import factory
from factory import Faker, SubFactory
from app.models.user import User
from app.models.document import Document
from app.models.ai_interaction import Reflection

class UserFactory(factory.Factory):
    class Meta:
        model = User

    id = factory.Faker("uuid4")
    email = factory.Faker("email")
    full_name = factory.Faker("name")
    hashed_password = "hashed_test_password"

class DocumentFactory(factory.Factory):
    class Meta:
        model = Document

    id = factory.Faker("uuid4")
    user_id = factory.LazyAttribute(lambda obj: obj.user.id)
    title = factory.Faker("sentence", nb_words=4)
    content = factory.Faker("text", max_nb_chars=500)
    word_count = factory.LazyAttribute(lambda obj: len(obj.content.split()))

class ReflectionFactory(factory.Factory):
    class Meta:
        model = Reflection

    id = factory.Faker("uuid4")
    user_id = factory.LazyAttribute(lambda obj: obj.user.id)
    document_id = factory.LazyAttribute(lambda obj: obj.document.id)
    content = factory.Faker("text", max_nb_chars=300)
    word_count = factory.LazyAttribute(lambda obj: len(obj.content.split()))
    quality_score = factory.Faker("pyfloat", min_value=1, max_value=10)
```

### Task 5: Create test utilities

```python
# backend/tests/utils.py
from typing import Dict, Any
from httpx import AsyncClient

async def create_test_user(client: AsyncClient) -> Dict[str, Any]:
    """Create a test user and return auth headers"""
    user_data = {
        "email": "test@example.com",
        "password": "testpass123",
        "full_name": "Test User"
    }
    response = await client.post("/api/auth/register", json=user_data)
    assert response.status_code == 200

    # Login to get token
    login_data = {"username": user_data["email"], "password": user_data["password"]}
    response = await client.post("/api/auth/login", data=login_data)
    token = response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}

def create_thoughtful_reflection(word_count: int = 100) -> str:
    """Create a reflection that should pass quality checks"""
    return f"""
    I'm working on understanding the complexities of {faker.word()}.
    The main challenge I'm facing is how to structure my argument effectively.
    I've been considering multiple perspectives, particularly...
    """ + " ".join(faker.words(word_count - 20))
```

### Task 6: Write example test

```python
# backend/tests/test_setup_example.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test that the API is running"""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

@pytest.mark.asyncio
async def test_user_creation_flow(client: AsyncClient):
    """Test complete user registration flow"""
    user_data = {
        "email": "newuser@example.com",
        "password": "securepass123",
        "full_name": "New User"
    }

    response = await client.post("/api/auth/register", json=user_data)
    assert response.status_code == 200
    assert response.json()["email"] == user_data["email"]
```

## Definition of Done

- [x] All test dependencies installed
- [x] Pytest configuration complete
- [x] Test database isolated from dev
- [x] Async fixtures working
- [x] Example tests passing
- [x] README with test running instructions

## Completed Tasks

See task breakdown files:

- [TASK-010-001](../../tasks/backend/TASK-010-001-install-dependencies.md): Install Test Dependencies
- [TASK-010-002](../../tasks/backend/TASK-010-002-pytest-configuration.md): Configure Pytest
- [TASK-010-003](../../tasks/backend/TASK-010-003-test-fixtures.md): Create Test Database Fixtures
- [TASK-010-004](../../tasks/backend/TASK-010-004-test-factories.md): Create Test Factories
- [TASK-010-005](../../tasks/backend/TASK-010-005-test-utilities.md): Create Test Utilities
- [TASK-010-006](../../tasks/backend/TASK-010-006-example-tests.md): Create Example Tests
- [TASK-010-007](../../tasks/backend/TASK-010-007-test-runner.md): Create Test Runner Script
- [TASK-010-008](../../tasks/backend/TASK-010-008-documentation.md): Create Test Documentation

## Notes

This is the foundation - without this, no other testing can happen. Make sure the setup is rock solid and well-documented so every developer can write tests easily.
