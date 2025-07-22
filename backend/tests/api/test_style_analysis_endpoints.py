"""Test suite for Style Analysis API endpoints"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.test_helpers import (
    create_test_document_in_db,
    create_test_document_version_in_db,
    create_test_user_in_db,
)


@pytest.mark.asyncio
async def test_analyze_writing_style_endpoint(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test the POST /api/ai/style/analyze endpoint"""
    # Arrange
    user_data = await authenticated_client.get("/api/auth/me")
    user_id = user_data.json()["id"]
    document = await create_test_document_in_db(db_session, user_id)

    request_data = {
        "text": "The implementation of sustainable policies has become increasingly important.",
        "document_id": str(document.id),
    }

    # Act
    response = await authenticated_client.post(
        "/api/ai/style/analyze", json=request_data
    )

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert "patterns" in data
    assert "tone" in data
    assert "sentence_complexity" in data
    assert "vocabulary_level" in data
    assert isinstance(data["patterns"], list)


@pytest.mark.asyncio
async def test_analyze_style_without_document(authenticated_client: AsyncClient):
    """Test style analysis without document_id"""
    request_data = {"text": "This is a simple test sentence."}

    response = await authenticated_client.post(
        "/api/ai/style/analyze", json=request_data
    )

    assert response.status_code == 200
    data = response.json()
    assert "tone" in data


@pytest.mark.asyncio
async def test_style_feedback_endpoint(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test the POST /api/ai/style/feedback endpoint"""
    # Arrange
    user_data = await authenticated_client.get("/api/auth/me")
    user_id = user_data.json()["id"]
    document = await create_test_document_in_db(db_session, user_id)

    request_data = {
        "text": "I think that maybe the environment is important.",
        "document_id": str(document.id),
        "ai_level": "standard",
        "genre": "argumentative",
    }

    # Act
    response = await authenticated_client.post(
        "/api/ai/style/feedback", json=request_data
    )

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert "feedback" in data
    assert "ai_level" in data
    assert "?" in data["feedback"]  # Should contain questions


@pytest.mark.asyncio
async def test_style_feedback_prevents_content_generation(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test that style feedback doesn't generate content for fix requests"""
    # Arrange
    user_data = await authenticated_client.get("/api/auth/me")
    user_id = user_data.json()["id"]
    document = await create_test_document_in_db(db_session, user_id)

    request_data = {
        "text": "Fix this sentence for me: Me and him went to store.",
        "document_id": str(document.id),
    }

    # Act
    response = await authenticated_client.post(
        "/api/ai/style/feedback", json=request_data
    )

    # Assert
    assert response.status_code == 200
    data = response.json()
    feedback = data["feedback"]
    # Should not contain corrected version
    assert "He and I" not in feedback
    assert "the store" not in feedback
    # Should contain guiding questions
    assert "?" in feedback


@pytest.mark.asyncio
async def test_style_evolution_endpoint(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test the GET /api/ai/style/evolution/{document_id} endpoint"""
    # Arrange
    user_data = await authenticated_client.get("/api/auth/me")
    user_id = user_data.json()["id"]
    document = await create_test_document_in_db(db_session, user_id)

    # Create multiple versions
    await create_test_document_version_in_db(
        db_session, str(document.id), "Initial draft with simple language.", 1
    )
    await create_test_document_version_in_db(
        db_session,
        str(document.id),
        "The implementation of sustainable policies has become increasingly important in modern society.",
        2,
    )

    # Act
    response = await authenticated_client.get(f"/api/ai/style/evolution/{document.id}")

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["document_id"] == str(document.id)
    assert data["versions_analyzed"] == 2
    assert "evolution" in data
    assert "current_metrics" in data


@pytest.mark.asyncio
async def test_style_evolution_insufficient_versions(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test style evolution with insufficient versions"""
    # Arrange
    user_data = await authenticated_client.get("/api/auth/me")
    user_id = user_data.json()["id"]
    document = await create_test_document_in_db(db_session, user_id)

    # Only create one version
    await create_test_document_version_in_db(
        db_session, str(document.id), "Single version content.", 1
    )

    # Act
    response = await authenticated_client.get(f"/api/ai/style/evolution/{document.id}")

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["overall_trend"] == "insufficient_data"
    assert "message" in data


@pytest.mark.asyncio
async def test_style_goal_comparison_endpoint(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test the POST /api/ai/style/compare-goal endpoint"""
    # Arrange
    user_data = await authenticated_client.get("/api/auth/me")
    user_id = user_data.json()["id"]
    document = await create_test_document_in_db(db_session, user_id)

    request_data = {
        "text": "The data shows a clear trend.",
        "style_goal": "academic_formal",
        "document_id": str(document.id),
    }

    # Act
    response = await authenticated_client.post(
        "/api/ai/style/compare-goal", json=request_data
    )

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert "alignment_score" in data
    assert "improvement_questions" in data
    assert "current_style" in data
    assert "target_style" in data
    assert data["target_style"] == "academic_formal"
    assert isinstance(data["improvement_questions"], list)
    assert len(data["improvement_questions"]) >= 1


@pytest.mark.asyncio
async def test_style_endpoints_require_authentication(client: AsyncClient):
    """Test that all style endpoints require authentication"""
    # Test analyze endpoint
    response = await client.post("/api/ai/style/analyze", json={"text": "Test"})
    assert response.status_code == 401

    # Test feedback endpoint
    response = await client.post(
        "/api/ai/style/feedback", json={"text": "Test", "document_id": "123"}
    )
    assert response.status_code == 401

    # Test evolution endpoint
    response = await client.get("/api/ai/style/evolution/123")
    assert response.status_code == 401

    # Test compare-goal endpoint
    response = await client.post(
        "/api/ai/style/compare-goal", json={"text": "Test", "style_goal": "academic"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_style_endpoints_verify_document_ownership(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test that style endpoints verify document ownership"""
    # Create another user's document
    other_user = await create_test_user_in_db(db_session, email="other@test.com")
    other_doc = await create_test_document_in_db(db_session, str(other_user.id))

    # Try to analyze style for document we don't own
    response = await authenticated_client.post(
        "/api/ai/style/analyze", json={"text": "Test", "document_id": str(other_doc.id)}
    )
    assert response.status_code == 404

    # Try to get feedback for document we don't own
    response = await authenticated_client.post(
        "/api/ai/style/feedback",
        json={"text": "Test", "document_id": str(other_doc.id)},
    )
    assert response.status_code == 404

    # Try to get evolution for document we don't own
    response = await authenticated_client.get(f"/api/ai/style/evolution/{other_doc.id}")
    assert response.status_code == 404
