"""
Test that the pytest infrastructure is properly set up.
These tests verify the test environment without requiring full API implementation.
"""

import pytest

from tests.factories import (
    DocumentFactory,
    ReflectionFactory,
    UserFactory,
    create_shallow_reflection,
    create_thoughtful_reflection,
)


def test_pytest_is_working():
    """Verify pytest is installed and working"""
    assert True


def test_factories_work():
    """Test that all factories produce valid data"""
    # Test UserFactory
    user = UserFactory()
    assert isinstance(user, dict)
    assert "@" in user["email"]
    assert user["hashed_password"].startswith("$2b$")

    # Test DocumentFactory
    doc = DocumentFactory()
    assert isinstance(doc, dict)
    assert len(doc["title"]) > 0
    assert doc["word_count"] == len(doc["content"].split())

    # Test ReflectionFactory
    reflection = ReflectionFactory()
    assert isinstance(reflection, dict)
    assert 1.0 <= reflection["quality_score"] <= 10.0
    assert reflection["quality_level"] in ["shallow", "basic", "standard", "advanced"]


def test_reflection_content_generators():
    """Test the reflection content generation helpers"""
    # Thoughtful reflection should be long
    thoughtful = create_thoughtful_reflection(100)
    word_count = len(thoughtful.split())
    assert word_count >= 80  # Allow some variance

    # Shallow reflection should be short
    shallow = create_shallow_reflection()
    assert len(shallow.split()) < 10


def test_environment_variables_loaded():
    """Verify required environment variables are set"""
    import os

    # These should be set by our test script
    assert os.getenv("DATABASE_URL") is not None
    assert os.getenv("SECRET_KEY") is not None
    assert os.getenv("OPENAI_API_KEY") is not None
    assert os.getenv("ANTHROPIC_API_KEY") is not None

    # DATABASE_URL should point to test database
    assert "scribe_test" in os.getenv("DATABASE_URL")


def test_imports_work():
    """Verify we can import key modules"""
    try:
        from app.core.config import settings  # noqa: F401
        from app.core.database import Base, get_db  # noqa: F401
        from app.models.document import Document  # noqa: F401
        from app.models.user import User  # noqa: F401

        assert True
    except ImportError as e:
        pytest.fail(f"Import failed: {e}")


@pytest.mark.asyncio
async def test_async_works():
    """Verify async tests work"""
    import asyncio

    await asyncio.sleep(0.001)
    assert True
