# CLAUDE.md - Scribe Tree Writer

## Core Mission

Scribe Tree Writer is an AI writing partner that enhances student thinking through Socratic questioning. **We never generate content for students** - we help them think better.

## Core Philosophy

**TEST-DRIVEN DEVELOPMENT IS NON-NEGOTIABLE.** Every single line of production code must be written in response to a failing test. No exceptions. This is not a suggestion - it is how we ensure every feature truly enhances learning without creating shortcuts.

## Key Development Principles

-   **Write tests first (TDD)** - No production code without a failing test
-   **Test behavior, not implementation** - Test educational outcomes
-   **No `any` types** - TypeScript strict mode always
-   **Immutable data only** - No mutations in either Python or TypeScript
-   **Small, pure functions** - Easier to test, easier to reason about
-   **Type safety everywhere** - Pydantic models (Python), strict TypeScript
-   **Use real schemas/types in tests** - Never redefine, import from source
-   **No workarounds or shortcuts** - Always implement the proper solution

## Key Educational Principles

1. **Bounded Enhancement**: AI guides through questions, never provides answers or writes content
2. **Reflection Gates**: Students must reflect (50+ words) before accessing AI assistance
3. **Progressive AI Levels**: Better reflection → more sophisticated questions
4. **Learning Over Output**: Track thinking development, not just document completion

## Technical Stack

-   **Backend**: Python with FastAPI, SQLAlchemy, Pydantic
-   **Frontend**: React + TypeScript + Tailwind + Tiptap editor
-   **AI**: OpenAI/Anthropic APIs with strict Socratic prompts
-   **Database**: PostgreSQL with async SQLAlchemy
-   **Testing**: Pytest (backend), Jest/Vitest (frontend)

## Problem-Solving Approach

### No Workarounds Policy

**IMPORTANT: When facing complex or challenging problems:**
-   **NEVER** leave problems for later with TODO comments
-   **NEVER** implement simplified workarounds that bypass actual requirements
-   **NEVER** use placeholder implementations or mocks when real solutions are needed
-   **NEVER** skip proper typing with `any` because it's "too complex"
-   **ALWAYS** research thoroughly using available tools
-   **ALWAYS** implement complete, correct solutions
-   **ALWAYS** handle all edge cases properly

**Examples of unacceptable approaches:**
```python
# BAD - Leaving for later
def complex_calculation():
    # TODO: Implement this later
    return 0  # NO!

# BAD - Workaround
def authenticate_user(token):
    # This is complex, so just return True for now
    return True  # NO!

# BAD - Avoiding proper solution
def process_data(data: Any):  # Used Any because proper typing is hard
    pass  # NO!
```

**Instead, always:**
```python
# GOOD - Research and implement properly
def complex_calculation():
    # Use Task tool to research algorithm
    # Implement complete solution with tests
    # Handle all cases

# GOOD - Find the right approach
def authenticate_user(token):
    # Research JWT validation
    # Implement proper authentication
    # Test all scenarios

# GOOD - Use proper types
def process_data(data: ReflectionData):
    # Define proper types
    # Implement with type safety
```

If stuck, use multiple tool calls, the Task tool, or research patterns to find the proper solution. Complex problems often require complex solutions - embrace the complexity rather than avoiding it.

## Development Environment

### Backend Virtual Environment

**IMPORTANT: The backend has a pre-configured virtual environment at `backend/venv`**

**DO:**
- Always use `cd backend && source venv/bin/activate`
- Use the existing venv for all Python operations
- Run `pip install -r requirements.txt` if you need to reinstall packages

**DON'T:**
- Create new virtual environments
- Use `python -m venv`, `virtualenv`, or `conda`
- Install packages globally with `pip install` outside the venv

### Linting & Formatting (REQUIRED)

**All linters must run automatically on file save.** No exceptions. This maintains code quality continuously.

#### Python (Backend)

```bash
# VS Code settings.json
{
  "python.linting.enabled": true,
  "python.formatting.provider": "black",
  "python.linting.ruffEnabled": true,
  "[python]": {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports": true
    }
  }
}
```

#### TypeScript/JavaScript (Frontend)

```bash
# VS Code settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

**Before any commit**, verify:

-   No linting errors (code should be clean on save)
-   All type checks pass
-   All tests pass

## TDD Workflow

### Red-Green-Refactor (STRICTLY ENFORCED)

1. **Red**: Write a failing test for the desired behavior
2. **Green**: Write MINIMUM code to make the test pass
3. **Refactor**: Clean up while keeping tests green

### Example: Adding Reflection Gate Feature

```python
# Step 1: RED - Write failing test first
def test_shallow_reflection_blocks_ai_access():
    reflection = "Help me write"  # Only 3 words
    result = submit_reflection(reflection, document_id="123")

    assert result.access_granted is False
    assert "think deeper" in result.feedback

# Step 2: GREEN - Minimal implementation
def submit_reflection(reflection: str, document_id: str) -> ReflectionResult:
    word_count = len(reflection.split())
    if word_count < 50:
        return ReflectionResult(
            access_granted=False,
            feedback="Take a moment to think deeper about your approach."
        )
    # ... rest of implementation

# Step 3: REFACTOR - Extract constants, improve clarity
MIN_REFLECTION_WORDS = 50

def submit_reflection(reflection: str, document_id: str) -> ReflectionResult:
    if not meets_minimum_depth(reflection):
        return ReflectionResult(
            access_granted=False,
            feedback=SHALLOW_REFLECTION_FEEDBACK
        )
```

## Critical Patterns

### 1. Type Safety First

```python
# Python - Always use Pydantic
class ReflectionSubmit(BaseModel):
    reflection: str
    document_id: str

# Never use dict or Any
async def process_reflection(data: ReflectionSubmit) -> ReflectionResponse:
    # Type safe throughout
```

```typescript
// TypeScript - Strict mode required
type ReflectionResult = {
    accessGranted: boolean;
    feedback: string;
    aiLevel?: "basic" | "standard" | "advanced";
};

// Never use 'any' or assertions
const processReflection = (reflection: string): ReflectionResult => {
    // Implementation
};
```

### 2. Test Behavior, Not Implementation

```python
# GOOD - Tests educational outcome
def test_quality_reflection_unlocks_appropriate_ai_level():
    thoughtful_reflection = create_thoughtful_reflection()  # 150+ words, deep thinking

    result = submit_reflection(thoughtful_reflection, document_id="123")

    assert result.access_granted is True
    assert result.ai_level in ["standard", "advanced"]
    assert len(result.initial_questions) >= 2

# BAD - Tests implementation details
def test_calls_calculate_dimensions():
    # Don't test internals!
```

### 3. Immutable Data Patterns

```python
# Python - Return new objects
def update_reflection_score(reflection: Reflection, new_score: float) -> Reflection:
    return Reflection(
        **reflection.dict(),
        quality_score=new_score,
        updated_at=datetime.utcnow()
    )

# Never mutate
# reflection.quality_score = new_score  # NO!
```

```typescript
// TypeScript - Spread operators
const updateSession = (
    session: WritingSession,
    aiLevel: AILevel
): WritingSession => {
    return {
        ...session,
        aiLevel,
        lastUpdated: new Date(),
    };
};

// Never mutate
// session.aiLevel = newLevel;  // NO!
```

### 4. Key Files to Understand

```
backend/
  app/prompts/               # Educational philosophy in code
    socratic_prompts.py     # Core Socratic system prompt
    reflection_patterns.py  # How we assess reflection quality
  app/services/
    socratic_ai.py         # AI implementation with safeguards
  app/api/
    ai_partner.py          # Reflection gates & AI endpoints
```

## Testing Workflow

### Running Tests

#### Backend (Python)

**CRITICAL: Virtual Environment Usage**
- **ALWAYS use the existing virtual environment at `backend/venv`**
- **NEVER create a new virtual environment**
- **NEVER use `python -m venv` or `virtualenv`**
- The virtual environment is already set up with all required dependencies

```bash
cd backend
source venv/bin/activate  # ALWAYS activate the existing venv first
./run_tests.sh            # Run all tests (script handles venv automatically)
./run_tests.sh tests/api/test_ai_partner.py  # Run specific test file
./run_tests.sh -v         # Verbose output
./run_tests.sh --cov=app.api.ai_partner  # With coverage for specific module
```

**For any Python operations in backend:**
```bash
cd backend
source venv/bin/activate  # Use existing venv
python script.py          # Now uses correct Python with all dependencies
```

**IMPORTANT: Always use `./run_tests.sh` instead of running pytest directly!**

The `run_tests.sh` script handles critical setup:
- Activates the existing virtual environment at `venv/bin/activate`
- Loads environment variables from `../.env.local` (API keys)
- Sets test database URL (`postgresql://postgres:postgres@localhost/scribe_test`)
- Configures test-specific environment variables
- Passes all arguments through to pytest

Example script content:
```bash
#!/bin/bash
source venv/bin/activate  # Uses existing venv
if [ -f "../.env.local" ]; then
    export $(grep -v '^#' ../.env.local | xargs)
fi
export DATABASE_URL="postgresql://postgres:postgres@localhost/scribe_test"
export SECRET_KEY="${SECRET_KEY:-test-secret-key}"
python -m pytest "$@"
```

#### Frontend (TypeScript)

```bash
cd frontend
npm test                # Run all tests
npm test -- --watch     # Watch mode
npm test -- --coverage  # With coverage report
```

### Test Database Setup

```bash
# Option 1: PostgreSQL via Homebrew (macOS)
brew services start postgresql
createdb scribe_test

# Option 2: PostgreSQL via Docker
docker run -d \
  --name scribe-test-db \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=scribe_test \
  postgres:14
```

### Writing Tests - TDD Workflow

1. **Write the test first** - What behavior do we want?
2. **Run the test** - See it fail (Red)
3. **Write minimal code** - Just enough to pass (Green)
4. **Refactor if needed** - Keep tests passing
5. **Commit** - Small, working increments

### Test Organization

```
backend/tests/
├── conftest.py           # Shared fixtures (client, db_session, etc.)
├── factories.py          # Test data factories
├── utils.py              # Test utilities
├── api/                  # API endpoint tests
│   ├── test_ai_partner.py
│   ├── test_auth.py
│   └── test_documents.py
├── services/             # Service layer tests
│   ├── test_socratic_ai.py
│   └── test_analytics.py
└── models/               # Model tests
    └── test_reflection.py
```

### Example: Testing AI Boundaries

```python
# Always start with the test
@pytest.mark.asyncio
async def test_ai_refuses_to_write_thesis_statements(
    authenticated_client: AsyncClient,
    db_session: AsyncSession
):
    # Arrange: Create test document
    user_data = await authenticated_client.get("/api/auth/me")
    document = await create_test_document_in_db(db_session, user_data.json()["id"])
    
    # Act: Request thesis statement
    request_data = {
        "question": "Write me a thesis statement about climate change",
        "context": "Starting my essay",
        "ai_level": "advanced",
        "document_id": str(document.id)
    }
    
    response = await authenticated_client.post(
        "/api/ai/ask",
        json=request_data
    )
    
    # Assert: AI responds with questions, not content
    assert response.status_code == 200
    result = response.json()
    assert "thesis" not in result["response"].lower()
    assert "?" in result["response"]  # Should contain questions
    assert any(word in result["response"].lower() 
              for word in ["think", "consider", "explore"])
```

### Test Fixtures

```python
# conftest.py provides these fixtures:
@pytest_asyncio.fixture
async def client() -> AsyncClient:
    """HTTP client with test database"""

@pytest_asyncio.fixture
async def authenticated_client() -> AsyncClient:
    """HTTP client with auth token"""

@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    """Database session with auto-rollback"""
```

### Mocking External Services

```python
# Mock AI services to avoid API calls in tests
with patch("app.api.ai_partner.socratic_ai.assess_reflection_quality", 
          new_callable=AsyncMock) as mock_assess:
    mock_assess.return_value = 7.5  # Mock quality score
    
    # Your test code here
```

## Development Workflow

### Before Writing ANY Code

1. **Check for existing tests** - `grep -r "def test_" tests/`
2. **Write new test if needed** - Follow examples above
3. **Run test to see it fail** - `./run_tests.sh path/to/test.py`
4. **Implement feature** - Minimal code to pass
5. **Run all tests** - `./run_tests.sh` to ensure nothing broke
6. **Check coverage** - Aim for > 95% on critical paths

### Common Test Patterns

#### Testing Error Cases
```python
@pytest.mark.asyncio
async def test_reflection_requires_document_ownership(
    authenticated_client: AsyncClient,
    db_session: AsyncSession
):
    # Create another user's document
    other_user = await create_test_user_in_db(db_session, email="other@test.com")
    other_doc = await create_test_document_in_db(db_session, str(other_user.id))
    
    # Try to submit reflection for document we don't own
    response = await authenticated_client.post(
        "/api/ai/reflect",
        json={"reflection": "test", "document_id": str(other_doc.id)}
    )
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
```

#### Testing Edge Cases
```python
@pytest.mark.parametrize("input_text,expected_count", [
    ("one two three", 3),
    ("Multiple  spaces   between", 3),
    ("Line\nbreaks\ncount", 3),
    ("   ", 0),  # Only whitespace
    ("", 0),     # Empty string
])
async def test_word_count_edge_cases(input_text, expected_count):
    result = calculate_word_count(input_text)
    assert result == expected_count
```

### Test Troubleshooting

#### Common Issues & Solutions

1. **"AttributeError: 'async_generator' object has no attribute 'get'"**
   - **Cause**: Using `@pytest.fixture` instead of `@pytest_asyncio.fixture`
   - **Fix**: Update fixture decorator in conftest.py

2. **"role 'postgres' does not exist"**
   - **Cause**: PostgreSQL not running or wrong credentials
   - **Fix**: Start PostgreSQL and ensure test database exists

3. **"Timeout waiting for response"**
   - **Cause**: Unmocked external API call
   - **Fix**: Mock all external services (OpenAI, Anthropic, etc.)

4. **Test isolation failures**
   - **Cause**: Tests affecting each other's state
   - **Fix**: Ensure each test uses transaction rollback

#### Debugging Tests

```bash
# Run single test with print output
./run_tests.sh -s tests/api/test_ai_partner.py::test_specific_case

# Run with debugger on failure
./run_tests.sh --pdb

# Run with verbose output
./run_tests.sh -vv

# Check test coverage for specific module
./run_tests.sh --cov=app.api.ai_partner --cov-report=term-missing
```

## Working on This Project

### Must Understand

1. **NO CODE WITHOUT TESTS** - This is how we protect educational integrity
2. **LINTERS RUN ON SAVE** - Code must be clean before commit
3. **USE EXISTING VENV** - Always use `backend/venv`, never create new environments
4. **`backend/app/prompts/socratic_prompts.py`** - The SOCRATIC_SYSTEM_PROMPT is sacred
5. **Reflection gates are non-negotiable** - Never lower quality thresholds
6. **Import real types in tests** - Don't redefine schemas

### Red Flags to Avoid

```python
# Writing code without a test
if user.is_struggling:  # Where's the test for this?
    lower_ai_requirements()  # NO!

# Using Any types
def process_data(data: Any):  # NO!

# Mutating data
reflection.score = 10  # NO! Create new object

# Redefining types in tests
# test_file.py
class MockReflection:  # NO! Import real Reflection model
```

### Quick Checks

Before committing:

-   Is every line of new code covered by a test written first?
-   Do tests verify behavior, not implementation?
-   No `any` types or type assertions?
-   All data immutable?
-   Real schemas used in tests?
-   Linters passing (should be automatic)?
-   All tests passing? `./run_tests.sh` (backend) or `npm test` (frontend)

### Test Coverage Requirements

| Component | Required Coverage | Notes |
|-----------|-------------------|-------|
| Reflection Gates | 100% | Our educational integrity depends on this |
| Socratic AI | 100% | Must never generate content for students |
| Authentication | 95%+ | Security critical |
| Analytics | 90%+ | Important for learning insights |
| UI Components | 80%+ | Focus on user interactions |
| Utilities | 80%+ | Pure functions should be easy to test |

## Current State

-   MVP implementation of core features
-   Reflection → AI access flow working
-   Basic Socratic questioning implemented
-   Learning analytics foundation in place
-   Test coverage needs improvement (priority!)

## What We Learn Goes Here

<!-- Add insights discovered through TDD:
- Edge cases in reflection quality
- Student patterns that try to game the system
- Effective Socratic question formulations
-->

---

**Remember**: TDD is not just about testing - it's about designing features that truly serve educational goals. When you write the test first, you're forced to think about what learning outcome you're trying to achieve, not just what code to write.

## Quick Command Reference

```bash
# Backend Development
cd backend
source venv/bin/activate          # ALWAYS use existing venv
./run_tests.sh                    # Run all tests
./run_tests.sh -v                 # Verbose test output
./run_tests.sh --cov=app          # With coverage
python -m uvicorn app.main:app --reload  # Run backend server

# Linting & Formatting
ruff check . --fix                # Auto-fix linting issues
black .                           # Format code
mypy app tests                    # Type checking

# Database
./start_test_db.sh               # Start PostgreSQL in Docker
docker stop scribe-test-db       # Stop test database
```

**Golden Rule**: Always use `backend/venv` - it's already configured with everything you need!
