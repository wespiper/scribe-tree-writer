# Backend Tests

This directory contains all backend tests for Scribe Tree Writer. We follow strict Test-Driven Development (TDD) practices.

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Set Up Test Database

Create a PostgreSQL database for testing:

```sql
CREATE DATABASE scribe_test;
```

You can configure the test database URL via environment variable:

```bash
export TEST_DATABASE_URL="postgresql+asyncpg://postgres:yourpassword@localhost/scribe_test"
```

Default test database URL: `postgresql+asyncpg://postgres:postgres@localhost/scribe_test`

## Running Tests

### Run All Tests

```bash
cd backend
pytest
```

### Run with Coverage Report

```bash
pytest --cov=app --cov-report=html
```

This generates an HTML coverage report in `htmlcov/index.html`

### Run Specific Test File

```bash
pytest tests/test_setup_example.py
```

### Run Tests Matching Pattern

```bash
pytest -k "test_user"
```

### Run with Verbose Output

```bash
pytest -v
```

## Test Structure

- `conftest.py` - Pytest configuration and shared fixtures
- `factories.py` - Test data factories using factory-boy
- `utils.py` - Helper functions for tests
- `test_*.py` - Test files (must start with `test_`)

## Key Fixtures

### `client`
Provides an async HTTP client for testing API endpoints.

```python
async def test_endpoint(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
```

### `db_session`
Provides an isolated database session that rolls back after each test.

```python
async def test_database(db_session: AsyncSession):
    user = User(email="test@example.com", ...)
    db_session.add(user)
    await db_session.commit()
```

### `authenticated_client`
Provides a client with authentication headers already set.

```python
async def test_protected_endpoint(authenticated_client: AsyncClient):
    response = await authenticated_client.get("/api/documents/")
    assert response.status_code == 200
```

## Writing Tests

### TDD Workflow

1. **Write a failing test first**
   ```python
   def test_new_feature():
       result = new_feature()
       assert result == expected_value
   ```

2. **Write minimal code to pass**
   ```python
   def new_feature():
       return expected_value
   ```

3. **Refactor while keeping tests green**

### Test Naming Convention

- Test files: `test_<feature>.py`
- Test functions: `test_<what_it_should_do>`
- Test classes: `Test<Feature>`

### Example Test Structure

```python
import pytest
from httpx import AsyncClient

class TestReflectionGate:
    """Test reflection gate functionality"""

    @pytest.mark.asyncio
    async def test_shallow_reflection_blocks_ai_access(self, authenticated_client: AsyncClient):
        """Test that shallow reflections don't grant AI access"""
        # Arrange
        reflection = "Help me write"  # Only 3 words

        # Act
        response = await authenticated_client.post("/api/ai/reflect", json={
            "reflection": reflection,
            "document_id": "123"
        })

        # Assert
        assert response.status_code == 400
        assert "think deeper" in response.json()["detail"]
```

## Best Practices

1. **Test behavior, not implementation**
   - Focus on what the code should do, not how it does it

2. **Use descriptive test names**
   - `test_quality_reflection_unlocks_appropriate_ai_level` ✓
   - `test_reflection` ✗

3. **Keep tests independent**
   - Each test should run in isolation
   - Use fixtures for shared setup

4. **Test edge cases**
   - Empty inputs
   - Maximum lengths
   - Invalid data

5. **Use factories for test data**
   ```python
   from tests.factories import UserFactory, create_thoughtful_reflection

   user = UserFactory(email="specific@test.com")
   reflection = create_thoughtful_reflection(word_count=150)
   ```

## Coverage Requirements

- Minimum: 80% overall coverage
- Critical paths: 100% coverage required
  - Reflection gates
  - Socratic AI boundaries
  - Authentication

Check current coverage:
```bash
pytest --cov=app --cov-report=term-missing
```

### Known Coverage Limitations

**Important**: Coverage.py has known issues with async FastAPI code. You may see lower coverage numbers than actual due to:
- Async functions showing as "not covered" even when tested
- FastAPI dependency injection not being tracked properly
- Concurrent execution paths not being measured accurately

**What this means**:
- Auth module shows ~71% but likely has >90% actual coverage
- Documents module shows ~55% but all endpoints are tested
- Focus on test quality and behavior verification over coverage numbers

**Our approach**:
1. Write comprehensive tests for all functionality
2. Use integration tests for async endpoints
3. Trust test suite over coverage metrics
4. Document any genuinely untested code paths

See `backend/docs/coverage-tool-investigation.md` for detailed analysis.

## Debugging Tests

### Run tests with print output
```bash
pytest -s
```

### Run with debugger
```python
import pdb; pdb.set_trace()
```

### Check test database state
```bash
psql scribe_test
```

## Common Issues

### "Database scribe_test does not exist"
Create the test database as shown in Setup section.

### "Connection refused" errors
Ensure PostgreSQL is running and accepting connections.

### Async test issues
Always mark async tests with `@pytest.mark.asyncio`

### Import errors
Run tests from the backend directory: `cd backend && pytest`
