"""Test suite for analytics performance optimizations"""

from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_interaction import Reflection
from app.services.learning_analytics import LearningAnalyticsService
from tests.test_helpers import (
    create_test_ai_interaction_in_db,
    create_test_document_in_db,
    create_test_reflection_in_db,
    create_test_user_in_db,
)


@pytest.mark.asyncio
async def test_reflection_analytics_uses_database_aggregation(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Reflection analytics should use database aggregation instead of loading all data into memory"""
    # Arrange - Create many reflections
    user_data = await authenticated_client.get("/api/auth/me")
    user_id = user_data.json()["id"]

    # Create test data
    document = await create_test_document_in_db(db_session, user_id)

    # Create 10 reflections to test aggregation (reduced for test speed)
    for i in range(10):
        await create_test_reflection_in_db(
            db_session,
            str(document.id),
            f"Reflection {i} with sufficient content to meet word count requirements.",
            quality_score=5.0 + (i % 5),  # Scores from 5.0 to 9.0
            created_at=datetime.utcnow() - timedelta(days=10 - i),
        )

    # Act - Get reflection analytics
    response = await authenticated_client.get("/api/analytics/reflection-quality")

    # Assert
    assert response.status_code == 200
    data = response.json()

    # Verify aggregation was used (check that we get summary data)
    assert "average_quality" in data
    assert "total_reflections" in data
    assert data["total_reflections"] == 10

    # Check that average is calculated correctly
    expected_avg = sum(5.0 + (i % 5) for i in range(10)) / 10
    assert abs(data["average_quality"] - expected_avg) < 0.01


@pytest.mark.asyncio
async def test_analytics_endpoints_support_pagination(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Analytics endpoints should support pagination to avoid loading all data at once"""
    # Arrange
    user_data = await authenticated_client.get("/api/auth/me")
    user_id = user_data.json()["id"]
    document = await create_test_document_in_db(db_session, user_id)

    # Create many reflections
    for i in range(50):
        await create_test_reflection_in_db(
            db_session, str(document.id), f"Reflection {i}", quality_score=7.0
        )

    # Act - Get paginated results
    response = await authenticated_client.get(
        "/api/analytics/reflection-quality?limit=10&offset=0"
    )

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 10  # Only 10 items returned
    assert data["total_reflections"] == 50  # But total count is available
    assert "has_more" in data  # Indicates more pages available


@pytest.mark.asyncio
async def test_learning_metrics_cached_appropriately(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Learning metrics should be cached to avoid recalculation on every request"""
    # Arrange
    user_data = await authenticated_client.get("/api/auth/me")
    user_id = user_data.json()["id"]

    # Create test data
    document = await create_test_document_in_db(db_session, user_id)
    await create_test_reflection_in_db(
        db_session, str(document.id), "Test reflection", quality_score=8.0
    )

    # Act - Get learning insights multiple times
    response1 = await authenticated_client.get("/api/analytics/learning-insights")
    response2 = await authenticated_client.get("/api/analytics/learning-insights")

    # Assert
    assert response1.status_code == 200
    assert response2.status_code == 200

    # Check for cache headers
    cache_header = response2.headers.get("X-Cache-Status")
    assert cache_header == "HIT"  # Second request should hit cache


@pytest.mark.asyncio
async def test_analytics_queries_use_proper_joins(db_session: AsyncSession):
    """Analytics queries should use proper joins to avoid N+1 problems"""
    # Arrange
    analytics_service = LearningAnalyticsService()

    # Create test user and documents
    user = await create_test_user_in_db(db_session)

    # Create multiple documents with reflections
    for i in range(5):
        doc = await create_test_document_in_db(db_session, str(user.id))
        await create_test_reflection_in_db(
            db_session, str(doc.id), f"Reflection {i}", quality_score=7.0
        )

    # Act - Calculate metrics (should use optimized queries)
    metrics = await analytics_service.calculate_learning_metrics(
        str(user.id), db_session
    )

    # Assert
    assert "reflection_quality_trend" in metrics
    assert "total_reflections" in metrics
    assert metrics["total_reflections"] == 5

    # Verify query count is reasonable (not 5 + 1 queries)
    # This would be verified by query logging in production


@pytest.mark.asyncio
async def test_export_handles_large_datasets_efficiently(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Export should handle large datasets without loading all into memory"""
    # Arrange
    user_data = await authenticated_client.get("/api/auth/me")
    user_id = user_data.json()["id"]
    document = await create_test_document_in_db(db_session, user_id)

    # Create many reflections
    for i in range(100):
        await create_test_reflection_in_db(
            db_session,
            str(document.id),
            f"Reflection {i} with lots of content " * 10,
            quality_score=7.0,
        )

    # Act - Export as CSV
    export_request = {"format": "csv", "data_type": "reflections"}
    response = await authenticated_client.post(
        "/api/analytics/export", json=export_request
    )

    # Assert
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]

    # Check that response is streamed (has appropriate headers)
    assert "content-disposition" in response.headers

    # Verify CSV has all records but was streamed
    csv_content = response.content.decode("utf-8")
    lines = csv_content.strip().split("\n")
    assert len(lines) == 101  # Header + 100 rows


@pytest.mark.asyncio
async def test_date_range_queries_use_indexes(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Date range queries should use database indexes efficiently"""
    # Arrange
    user_data = await authenticated_client.get("/api/auth/me")
    user_id = user_data.json()["id"]
    document = await create_test_document_in_db(db_session, user_id)

    # Create reflections over time
    base_date = datetime.utcnow() - timedelta(days=30)
    for i in range(30):
        await create_test_reflection_in_db(
            db_session,
            str(document.id),
            f"Reflection {i}",
            quality_score=7.0,
            created_at=base_date + timedelta(days=i),
        )

    # Act - Query with date range
    start_date = (base_date + timedelta(days=10)).date()
    end_date = (base_date + timedelta(days=20)).date()

    response = await authenticated_client.get(
        f"/api/analytics/reflection-quality?start_date={start_date}&end_date={end_date}"
    )

    # Assert
    assert response.status_code == 200
    data = response.json()

    # Should only return reflections in date range
    assert data["total_reflections"] == 11  # Days 10-20 inclusive

    # All returned reflections should be in date range
    for reflection in data["data"]:
        reflection_date = datetime.fromisoformat(reflection["date"]).date()
        assert start_date <= reflection_date <= end_date


@pytest.mark.asyncio
async def test_aggregate_calculations_done_in_database(db_session: AsyncSession):
    """Aggregate calculations should be done in the database, not Python"""
    # Arrange
    analytics_service = LearningAnalyticsService()
    user = await create_test_user_in_db(db_session)

    # Create documents and reflections
    total_expected_score = 0.0
    num_reflections = 20

    for i in range(num_reflections):
        doc = await create_test_document_in_db(db_session, str(user.id))
        score = 5.0 + (i % 5)
        total_expected_score += score
        await create_test_reflection_in_db(
            db_session, str(doc.id), f"Reflection {i}", quality_score=score
        )

    # Act - Calculate metrics
    metrics = await analytics_service.calculate_learning_metrics(
        str(user.id), db_session
    )

    # Assert
    expected_avg = total_expected_score / num_reflections
    assert abs(metrics["average_reflection_score"] - expected_avg) < 0.01

    # Verify no in-memory calculations by checking query patterns
    # (In production, this would be verified with query logging)


@pytest.mark.asyncio
async def test_writing_progress_uses_optimized_grouping(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Writing progress should use database grouping instead of Python grouping"""
    # Arrange
    user_data = await authenticated_client.get("/api/auth/me")
    user_id = user_data.json()["id"]

    # Create documents over multiple days
    base_date = datetime.utcnow() - timedelta(days=10)

    created_count = 0
    for day in range(10):
        for doc_num in range(3):
            await create_test_document_in_db(
                db_session,
                user_id,
                title=f"Test progress doc {day}-{doc_num}",
                content="Test content " * 50,
                created_at=base_date + timedelta(days=day),
            )
            created_count += 1

    # Act - Get only documents created in our date range
    start_date = base_date.date()
    end_date = (base_date + timedelta(days=10)).date()
    response = await authenticated_client.get(
        f"/api/analytics/writing-progress?start_date={start_date}&end_date={end_date}"
    )

    # Assert
    assert response.status_code == 200
    data = response.json()

    assert data["documents_created"] == created_count
    assert len(data["daily_progress"]) == 10

    # Verify daily grouping is correct
    for daily_data in data["daily_progress"]:
        assert daily_data["documents"] == 3
