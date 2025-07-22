"""Comprehensive tests for document management API endpoints."""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from tests.test_utils import create_test_document_in_db, create_test_user_in_db


@pytest.mark.asyncio
async def test_list_documents_empty(authenticated_client: AsyncClient):
    """Test listing documents when user has none."""
    response = await authenticated_client.get("/api/documents/")

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_documents_multiple(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test listing multiple documents ordered by updated_at."""
    # Get authenticated user
    user_response = await authenticated_client.get("/api/auth/me")
    user_data = user_response.json()

    # Create multiple documents
    await create_test_document_in_db(
        db_session, user_data["id"], title="First Document"
    )
    await create_test_document_in_db(
        db_session, user_data["id"], title="Second Document"
    )
    await create_test_document_in_db(
        db_session, user_data["id"], title="Third Document"
    )

    # List documents
    response = await authenticated_client.get("/api/documents/")

    assert response.status_code == 200
    documents = response.json()
    assert len(documents) == 3

    # Verify fields
    for doc in documents:
        assert "id" in doc
        assert "title" in doc
        assert "word_count" in doc
        assert "updated_at" in doc
        assert "content" not in doc  # List doesn't include content

    # Verify order (most recent first)
    titles = [doc["title"] for doc in documents]
    assert titles == ["Third Document", "Second Document", "First Document"]


@pytest.mark.asyncio
async def test_list_documents_excludes_deleted(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test that deleted documents are not listed."""
    user_response = await authenticated_client.get("/api/auth/me")
    user_data = user_response.json()

    # Create normal document
    await create_test_document_in_db(
        db_session, user_data["id"], title="Visible Document"
    )

    # Create and soft-delete a document
    doc2 = await create_test_document_in_db(
        db_session, user_data["id"], title="Deleted Document"
    )
    doc2.is_deleted = True
    await db_session.commit()

    # List documents
    response = await authenticated_client.get("/api/documents/")

    assert response.status_code == 200
    documents = response.json()
    assert len(documents) == 1
    assert documents[0]["title"] == "Visible Document"


@pytest.mark.asyncio
async def test_create_document_with_defaults(authenticated_client: AsyncClient):
    """Test creating a document with default values."""
    response = await authenticated_client.post("/api/documents/", json={})

    assert response.status_code == 200
    document = response.json()

    assert document["title"] == "Untitled Document"
    assert document["content"] == ""
    assert document["word_count"] == 0
    assert "id" in document
    assert "created_at" in document
    assert "updated_at" in document


@pytest.mark.asyncio
async def test_create_document_with_content(authenticated_client: AsyncClient):
    """Test creating a document with title and content."""
    document_data = {
        "title": "My Essay",
        "content": "This is the beginning of my essay about climate change.",
    }

    response = await authenticated_client.post("/api/documents/", json=document_data)

    assert response.status_code == 200
    document = response.json()

    assert document["title"] == "My Essay"
    assert document["content"] == document_data["content"]
    assert document["word_count"] == 10  # Count words in content


@pytest.mark.asyncio
async def test_get_document_success(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test getting a specific document."""
    user_response = await authenticated_client.get("/api/auth/me")
    user_data = user_response.json()

    # Create document
    doc = await create_test_document_in_db(
        db_session,
        user_data["id"],
        title="Test Document",
        content="This is test content.",
    )

    # Get document
    response = await authenticated_client.get(f"/api/documents/{doc.id}")

    assert response.status_code == 200
    document = response.json()

    assert document["id"] == doc.id
    assert document["title"] == "Test Document"
    assert document["content"] == "This is test content."
    assert document["word_count"] == 4


@pytest.mark.asyncio
async def test_get_document_not_found(authenticated_client: AsyncClient):
    """Test getting a non-existent document."""
    response = await authenticated_client.get("/api/documents/nonexistent-id")

    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found"


@pytest.mark.asyncio
async def test_get_document_unauthorized(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test that users can't access other users' documents."""
    # Create another user's document
    other_user = await create_test_user_in_db(db_session, email="other@test.com")
    other_doc = await create_test_document_in_db(db_session, str(other_user.id))

    # Try to access it
    response = await authenticated_client.get(f"/api/documents/{other_doc.id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found"


@pytest.mark.asyncio
async def test_get_deleted_document_not_found(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test that deleted documents return 404."""
    user_response = await authenticated_client.get("/api/auth/me")
    user_data = user_response.json()

    # Create and soft-delete document
    doc = await create_test_document_in_db(db_session, user_data["id"])
    doc.is_deleted = True
    await db_session.commit()

    # Try to get it
    response = await authenticated_client.get(f"/api/documents/{doc.id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found"


@pytest.mark.asyncio
async def test_delete_document_success(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test soft deleting a document."""
    user_response = await authenticated_client.get("/api/auth/me")
    user_data = user_response.json()

    # Create document
    doc = await create_test_document_in_db(db_session, user_data["id"])

    # Delete it
    response = await authenticated_client.delete(f"/api/documents/{doc.id}")

    assert response.status_code == 200
    assert response.json()["message"] == "Document deleted successfully"

    # Verify it's soft deleted in database
    result = await db_session.execute(select(Document).where(Document.id == doc.id))
    deleted_doc = result.scalar_one()
    assert deleted_doc.is_deleted is True


@pytest.mark.asyncio
async def test_delete_document_not_found(authenticated_client: AsyncClient):
    """Test deleting a non-existent document."""
    response = await authenticated_client.delete("/api/documents/nonexistent-id")

    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found"


@pytest.mark.asyncio
async def test_delete_document_unauthorized(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test that users can't delete other users' documents."""
    # Create another user's document
    other_user = await create_test_user_in_db(db_session, email="other@test.com")
    other_doc = await create_test_document_in_db(db_session, str(other_user.id))

    # Try to delete it
    response = await authenticated_client.delete(f"/api/documents/{other_doc.id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found"
