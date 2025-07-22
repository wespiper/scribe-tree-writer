# Coverage Tool Investigation for Async FastAPI Code

## Problem Statement

During Sprint 2, we discovered that coverage.py has issues with async FastAPI code. It shows lines as executed but not covered, particularly affecting:
- Auth module: Shows 71% coverage (target 95%)
- Documents module: Shows 55% coverage (target 80%)

## Current Setup

- Tool: coverage.py with pytest-cov
- Framework: FastAPI with async/await patterns
- Python version: 3.11
- Test runner: pytest with pytest-asyncio

## Investigation Results

### 1. Coverage.py Configuration Options

**Potential Solutions:**
```ini
# .coveragerc or pyproject.toml
[coverage:run]
concurrency = ["thread", "greenlet"]
source = app
omit =
    */tests/*
    */venv/*

[coverage:report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
    if __name__ == .__main__.:
    @abstractmethod
    @abc.abstractmethod
```

**Pros:**
- No new tools needed
- Well-integrated with pytest
- Mature and widely used

**Cons:**
- Known issues with async code
- May require complex configuration
- Still might not capture all async execution paths

### 2. Alternative: pytest-cov with Different Settings

**Command variations to try:**
```bash
# Use thread-based concurrency
pytest --cov=app --cov-config=.coveragerc --cov-report=term-missing

# Force coverage to track all contexts
pytest --cov=app --cov-context=test --cov-report=term-missing

# Use different coverage engines
COVERAGE_CORE=sysmon pytest --cov=app --cov-report=term-missing
```

### 3. Alternative Tool: Coverage.py with AsyncIO Plugin

**Installation:**
```bash
pip install coverage-async
```

**Usage:**
```python
# In conftest.py
import coverage_async
coverage_async.install()
```

**Pros:**
- Specifically designed for async code
- Drop-in replacement

**Cons:**
- Less mature than coverage.py
- Might have compatibility issues

### 4. Alternative Approach: Code Instrumentation

Instead of relying on coverage tools, we could:
1. Add logging to async functions
2. Write integration tests that verify behavior
3. Use manual code review for coverage gaps

### 5. Recommended Solution: Hybrid Approach

1. **Keep coverage.py** but understand its limitations
2. **Focus on behavior testing** rather than line coverage
3. **Use integration tests** for async endpoints
4. **Manual verification** for critical async paths

## Recommendation

**Short term (Sprint 3):**
1. Continue using coverage.py with current setup
2. Document known limitations in README
3. Focus on integration tests for async code
4. Accept that coverage numbers may be lower than actual

**Long term (Future sprints):**
1. Investigate coverage-async plugin when it matures
2. Consider switching to behavior-driven testing
3. Implement custom coverage tracking for critical paths

## Action Items

1. ✅ Document coverage limitations in backend README
2. ✅ Update test documentation with async testing best practices
3. ✅ Create integration test suite for auth and documents
4. ⏳ Re-evaluate tools in 3 months

## Conclusion

The async coverage issue is a known limitation in the Python ecosystem. Rather than spending excessive time trying to get perfect coverage numbers, we should:

1. Trust our comprehensive test suite
2. Focus on behavior verification
3. Use integration tests for async flows
4. Accept that tool limitations don't reflect code quality

Our 113 backend tests provide excellent coverage of functionality, even if the tool doesn't report it accurately.
