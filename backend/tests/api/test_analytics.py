"""Tests for analytics API endpoints"""

from datetime import datetime, timedelta
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.test_helpers import (
    create_test_ai_interaction_in_db,
    create_test_document_in_db,
    create_test_reflection_in_db,
    create_test_user_in_db,
)


@pytest.mark.asyncio
async def test_analytics_endpoints_require_authentication(client: AsyncClient):
    """Test that all analytics endpoints require authentication"""
    endpoints = [
        "/api/analytics/reflection-quality",
        "/api/analytics/writing-progress",
        "/api/analytics/ai-interactions",
        "/api/analytics/learning-insights",
    ]

    for endpoint in endpoints:
        response = await client.get(endpoint)
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_reflection_quality_analytics(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test reflection quality analytics endpoint"""
    # Get current user
    user_response = await authenticated_client.get("/api/auth/me")
    user_id = user_response.json()["id"]

    # Create test data - reflections with different quality scores
    document = await create_test_document_in_db(db_session, user_id)

    # Create reflections over time
    today = datetime.utcnow()
    for i in range(5):
        reflection_date = today - timedelta(days=i)
        quality_score = 5.0 + (i * 0.5)  # Increasing quality over time
        await create_test_reflection_in_db(
            db_session,
            str(document.id),
            reflection_text=f"Test reflection {i} " * 20,  # 100+ words
            quality_score=quality_score,
            created_at=reflection_date,
        )

    # Test without date filters
    response = await authenticated_client.get("/api/analytics/reflection-quality")
    assert response.status_code == 200

    data = response.json()
    assert "data" in data
    assert len(data["data"]) == 5
    assert "average_quality" in data
    assert data["average_quality"] == 6.0  # (5.0 + 5.5 + 6.0 + 6.5 + 7.0) / 5

    # Test with date range filter
    response = await authenticated_client.get(
        "/api/analytics/reflection-quality",
        params={
            "start_date": (today - timedelta(days=2)).date().isoformat(),
            "end_date": today.date().isoformat(),
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 3


@pytest.mark.asyncio
async def test_get_writing_progress_analytics(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test writing progress analytics endpoint"""
    # Get current user
    user_response = await authenticated_client.get("/api/auth/me")
    user_id = user_response.json()["id"]

    # Create documents over time
    today = datetime.utcnow()
    for i in range(7):
        doc_date = today - timedelta(days=i)
        await create_test_document_in_db(
            db_session,
            user_id,
            title=f"Document {i}",
            content="Content " * (50 + i * 10),  # Increasing word count
            created_at=doc_date,
        )

    response = await authenticated_client.get("/api/analytics/writing-progress")
    assert response.status_code == 200

    data = response.json()
    assert "documents_created" in data
    assert data["documents_created"] == 7
    assert "total_words" in data
    assert "daily_progress" in data
    assert len(data["daily_progress"]) > 0


@pytest.mark.asyncio
async def test_get_ai_interactions_analytics(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test AI interactions analytics endpoint"""
    # Get current user
    user_response = await authenticated_client.get("/api/auth/me")
    user_id = user_response.json()["id"]

    # Create test document and reflection
    document = await create_test_document_in_db(db_session, user_id)
    reflection = await create_test_reflection_in_db(
        db_session,
        str(document.id),
        reflection_text="Deep thought " * 30,
        quality_score=7.5,
    )

    # Create AI interactions
    question_types = ["clarifying", "probing", "perspective", "conceptual"]
    for i, q_type in enumerate(question_types):
        await create_test_ai_interaction_in_db(
            db_session,
            str(reflection.id),
            user_question=f"Test question {i}",
            ai_response=f"What makes you think about {q_type}?",
            ai_level="standard" if i < 2 else "advanced",
        )

    response = await authenticated_client.get("/api/analytics/ai-interactions")
    assert response.status_code == 200

    data = response.json()
    assert "total_interactions" in data
    assert data["total_interactions"] == 4
    assert "ai_level_distribution" in data
    assert data["ai_level_distribution"]["standard"] == 2
    assert data["ai_level_distribution"]["advanced"] == 2
    assert "interaction_patterns" in data


@pytest.mark.asyncio
async def test_get_learning_insights_analytics(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test comprehensive learning insights endpoint"""
    # Get current user
    user_response = await authenticated_client.get("/api/auth/me")
    user_id = user_response.json()["id"]

    # Create comprehensive test data
    document = await create_test_document_in_db(db_session, user_id)

    # Create multiple reflections with varying quality
    for i in range(3):
        quality = 6.0 + i
        reflection = await create_test_reflection_in_db(
            db_session,
            str(document.id),
            reflection_text=f"Reflection {i} " * 40,
            quality_score=quality,
        )

        # Add AI interactions for each reflection
        await create_test_ai_interaction_in_db(
            db_session,
            str(reflection.id),
            user_question=f"Question for reflection {i}",
            ai_response="What leads you to that conclusion?",
        )

    response = await authenticated_client.get("/api/analytics/learning-insights")
    assert response.status_code == 200

    data = response.json()
    assert "reflection_quality_trend" in data
    assert data["reflection_quality_trend"] == "improving"
    assert "engagement_level" in data
    assert "strengths" in data
    assert "areas_for_growth" in data
    assert isinstance(data["strengths"], list)
    assert isinstance(data["areas_for_growth"], list)


@pytest.mark.asyncio
async def test_analytics_user_data_isolation(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test that users only see their own analytics data"""
    # Get current user
    user_response = await authenticated_client.get("/api/auth/me")
    user_id = user_response.json()["id"]

    # Create another user's data
    other_user = await create_test_user_in_db(db_session, email="other@test.com")
    other_doc = await create_test_document_in_db(db_session, str(other_user.id))
    await create_test_reflection_in_db(
        db_session,
        str(other_doc.id),
        reflection_text="Other user reflection " * 20,
        quality_score=8.0,
    )

    # Create current user's data
    my_doc = await create_test_document_in_db(db_session, user_id)
    await create_test_reflection_in_db(
        db_session,
        str(my_doc.id),
        reflection_text="My reflection " * 20,
        quality_score=6.0,
    )

    # Check reflection quality only shows current user's data
    response = await authenticated_client.get("/api/analytics/reflection-quality")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 1
    assert data["average_quality"] == 6.0  # Only my reflection, not the 8.0


@pytest.mark.asyncio
async def test_analytics_empty_data_handling(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test analytics endpoints handle empty data gracefully"""
    # Don't create any data

    endpoints = [
        "/api/analytics/reflection-quality",
        "/api/analytics/writing-progress",
        "/api/analytics/ai-interactions",
        "/api/analytics/learning-insights",
    ]

    for endpoint in endpoints:
        response = await authenticated_client.get(endpoint)
        assert response.status_code == 200
        data = response.json()
        # Each endpoint should return valid structure even with no data
        assert isinstance(data, dict)


@pytest.mark.asyncio
async def test_analytics_date_validation(authenticated_client: AsyncClient):
    """Test date parameter validation"""
    # Test invalid date format
    response = await authenticated_client.get(
        "/api/analytics/reflection-quality", params={"start_date": "invalid-date"}
    )
    assert response.status_code == 422

    # Test end date before start date
    response = await authenticated_client.get(
        "/api/analytics/reflection-quality",
        params={"start_date": "2024-01-15", "end_date": "2024-01-10"},
    )
    assert response.status_code == 422
    assert "End date must be after start date" in response.json()["detail"]


@pytest.mark.asyncio
async def test_analytics_performance_with_large_dataset(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test analytics endpoints perform well with larger datasets"""
    # Get current user
    user_response = await authenticated_client.get("/api/auth/me")
    user_id = user_response.json()["id"]

    # Create 100 reflections
    document = await create_test_document_in_db(db_session, user_id)

    for i in range(100):
        quality = 5.0 + (i % 5) * 0.5
        await create_test_reflection_in_db(
            db_session,
            str(document.id),
            reflection_text=f"Bulk reflection {i} " * 20,
            quality_score=quality,
        )

    # Measure response time
    import time

    start_time = time.time()
    response = await authenticated_client.get("/api/analytics/reflection-quality")
    end_time = time.time()

    assert response.status_code == 200
    assert end_time - start_time < 2.0  # Should complete within 2 seconds

    data = response.json()
    assert len(data["data"]) == 100
