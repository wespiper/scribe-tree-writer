"""Integration tests for document immutability patterns."""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from tests.test_utils import create_test_document_in_db


@pytest.mark.asyncio
async def test_document_update_preserves_immutability(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test that document updates don't mutate original in database."""
    # Create a document for the authenticated user
    user_response = await authenticated_client.get("/api/auth/me")
    user_data = user_response.json()

    # Create document
    document = await create_test_document_in_db(
        db_session, user_data["id"], title="Original Title", content="Original content"
    )

    # Store original values
    original_id = document.id
    original_created_at = document.created_at

    # Update document via API
    update_data = {
        "title": "Updated Title",
        "content": "Updated content with more words",
    }

    response = await authenticated_client.put(
        f"/api/documents/{document.id}", json=update_data
    )

    assert response.status_code == 200
    updated = response.json()

    # Verify response
    assert updated["id"] == original_id
    assert updated["title"] == "Updated Title"
    assert updated["content"] == "Updated content with more words"
    assert updated["word_count"] == 5

    # Verify created_at unchanged but updated_at changed
    # Handle timezone format differences (Z vs +00:00)
    assert (
        updated["created_at"].replace("Z", "+00:00") == original_created_at.isoformat()
    )
    assert updated["updated_at"] > updated["created_at"]

    # Fetch from database to ensure persistence
    result = await db_session.execute(
        select(Document).where(Document.id == original_id)
    )
    db_document = result.scalar_one()

    assert db_document.title == "Updated Title"
    assert db_document.content == "Updated content with more words"
    assert db_document.word_count == 5


@pytest.mark.asyncio
async def test_partial_document_update(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test that partial updates only modify specified fields."""
    # Create a document
    user_response = await authenticated_client.get("/api/auth/me")
    user_data = user_response.json()

    document = await create_test_document_in_db(
        db_session,
        user_data["id"],
        title="Original Title",
        content="Original content here",
    )

    # Update only title
    response = await authenticated_client.put(
        f"/api/documents/{document.id}", json={"title": "New Title Only"}
    )

    assert response.status_code == 200
    updated = response.json()

    # Title changed, content unchanged
    assert updated["title"] == "New Title Only"
    assert updated["content"] == "Original content here"
    assert updated["word_count"] == 3  # Original word count


@pytest.mark.asyncio
async def test_document_version_created_on_content_update(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test that document versions are created when content changes."""
    # Create a document
    user_response = await authenticated_client.get("/api/auth/me")
    user_data = user_response.json()

    document = await create_test_document_in_db(db_session, user_data["id"])

    # Update content (should create version)
    response = await authenticated_client.put(
        f"/api/documents/{document.id}", json={"content": "New content for version"}
    )

    assert response.status_code == 200

    # TODO: Add endpoint to check versions once implemented
    # For now, we just verify the update worked
    assert response.json()["content"] == "New content for version"


@pytest.mark.asyncio
async def test_document_no_version_on_title_only_update(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test that document versions are NOT created for title-only changes."""
    # Create a document
    user_response = await authenticated_client.get("/api/auth/me")
    user_data = user_response.json()

    document = await create_test_document_in_db(db_session, user_data["id"])

    # Update only title (should NOT create version)
    response = await authenticated_client.put(
        f"/api/documents/{document.id}", json={"title": "Just a new title"}
    )

    assert response.status_code == 200

    # TODO: Verify no new version was created once we have version endpoint
