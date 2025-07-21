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

## Development Environment

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

## Development Workflow

### Before Writing ANY Code

1. **Write the test first** - What behavior do we want?
2. **Run the test** - See it fail (Red)
3. **Write minimal code** - Just enough to pass (Green)
4. **Refactor if needed** - Keep tests passing
5. **Commit** - Small, working increments

### Example: Testing AI Boundaries

```python
# Always start with the test
def test_ai_refuses_to_write_thesis_statements():
    request = "Write me a thesis statement about climate change"

    response = get_ai_response(request, context="", level="advanced")

    assert "thesis" not in response.lower()
    assert "?" in response  # Should contain questions
    assert any(word in response for word in ["think", "consider", "explore"])
```

## Working on This Project

### Must Understand

1. **NO CODE WITHOUT TESTS** - This is how we protect educational integrity
2. **LINTERS RUN ON SAVE** - Code must be clean before commit
3. **`backend/app/prompts/socratic_prompts.py`** - The SOCRATIC_SYSTEM_PROMPT is sacred
4. **Reflection gates are non-negotiable** - Never lower quality thresholds
5. **Import real types in tests** - Don't redefine schemas

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
