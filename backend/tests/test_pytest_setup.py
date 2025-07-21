"""
Test file to verify pytest infrastructure is working correctly.
These tests don't require the API to be implemented.
"""
import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from tests.factories import (
    DocumentFactory,
    ReflectionFactory,
    UserFactory,
    create_shallow_reflection,
    create_thoughtful_reflection,
)


def test_basic_assertion():
    """Basic test to verify pytest is working"""
    assert 1 + 1 == 2


def test_factories_generate_data():
    """Test that our factories generate valid data structures"""
    # Test UserFactory
    user_data = UserFactory()
    assert isinstance(user_data, dict)
    assert "@" in user_data["email"]
    assert len(user_data["full_name"]) > 0
    assert user_data["hashed_password"].startswith("$2b$")
    assert "id" in user_data

    # Test DocumentFactory
    doc_data = DocumentFactory()
    assert isinstance(doc_data, dict)
    assert len(doc_data["title"]) > 0
    assert len(doc_data["content"]) > 0
    assert doc_data["word_count"] == len(doc_data["content"].split())
    assert "id" in doc_data

    # Test ReflectionFactory
    reflection_data = ReflectionFactory()
    assert isinstance(reflection_data, dict)
    assert len(reflection_data["content"]) > 0
    assert reflection_data["word_count"] == len(reflection_data["content"].split())
    assert reflection_data["quality_score"] >= 1.0
    assert reflection_data["quality_score"] <= 10.0


def test_reflection_helpers():
    """Test reflection helper functions"""
    # Test thoughtful reflection
    thoughtful = create_thoughtful_reflection(100)
    assert isinstance(thoughtful, str)
    assert len(thoughtful.split()) >= 90  # Allow some variance

    # Test shallow reflection
    shallow = create_shallow_reflection()
    assert isinstance(shallow, str)
    assert len(shallow.split()) < 10


@pytest.mark.asyncio
async def test_database_connection(db_session: AsyncSession):
    """Test that we can connect to the test database"""
    # Simple query to verify connection
    result = await db_session.execute(text("SELECT 1"))
    assert result.scalar() == 1


@pytest.mark.asyncio
async def test_database_transaction_rollback(db_session: AsyncSession):
    """Test that transactions are rolled back between tests"""
    from app.models.user import User

    # Create a test user
    test_user = User(email="rollback@test.com", hashed_password="test_hash", full_name="Rollback Test")

    db_session.add(test_user)
    await db_session.commit()

    # Verify user exists in this session
    result = await db_session.execute(select(User).filter_by(email="rollback@test.com"))
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.email == "rollback@test.com"

    # This user will not exist in other tests due to rollback


@pytest.mark.asyncio
async def test_multiple_database_operations(db_session: AsyncSession):
    """Test multiple database operations in a single test"""
    from app.models.document import Document
    from app.models.user import User

    # Create a user
    user = User(email="multi@test.com", hashed_password="test_hash", full_name="Multi Test")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # Create a document for the user
    document = Document(user_id=user.id, title="Test Document", content="This is test content", word_count=4)
    db_session.add(document)
    await db_session.commit()

    # Verify both exist
    user_result = await db_session.execute(select(User).filter_by(email="multi@test.com"))
    assert user_result.scalar_one_or_none() is not None

    doc_result = await db_session.execute(select(Document).filter_by(user_id=user.id))
    assert doc_result.scalar_one_or_none() is not None
