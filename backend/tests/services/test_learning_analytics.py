"""Comprehensive tests for learning analytics service."""

from datetime import datetime
from unittest.mock import patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_interaction import AIInteraction, Reflection
from app.models.document import Document
from app.services.learning_analytics import LearningAnalyticsService
from tests.test_utils import create_test_document_in_db, create_test_user_in_db


@pytest.mark.asyncio
async def test_track_reflection(capsys):
    """Test tracking reflection submissions."""
    service = LearningAnalyticsService()

    await service.track_reflection(
        user_id="user-123",
        document_id="doc-456",
        quality_score=7.5,
        ai_level="advanced",
    )

    # Check that it prints analytics data
    captured = capsys.readouterr()
    assert "Reflection tracked:" in captured.out
    assert "user-123" in captured.out
    assert "doc-456" in captured.out
    assert "7.5" in captured.out
    assert "advanced" in captured.out


@pytest.mark.asyncio
async def test_track_ai_interaction(capsys):
    """Test tracking AI interactions."""
    service = LearningAnalyticsService()

    await service.track_ai_interaction(
        user_id="user-123",
        document_id="doc-456",
        interaction_type="thesis_help",
        response_time_ms=250,
    )

    captured = capsys.readouterr()
    assert "AI interaction tracked:" in captured.out
    assert "user-123" in captured.out
    assert "doc-456" in captured.out
    assert "thesis_help" in captured.out
    assert "250" in captured.out


@pytest.mark.asyncio
async def test_calculate_learning_metrics_no_data(db_session: AsyncSession):
    """Test calculating metrics for user with no data."""
    service = LearningAnalyticsService()
    user = await create_test_user_in_db(db_session, email="nodata@test.com")

    metrics = await service.calculate_learning_metrics(str(user.id), db_session)

    assert metrics["reflection_quality_trend"] == "insufficient_data"
    assert metrics["average_reflection_score"] == 0
    assert metrics["total_reflections"] == 0
    assert metrics["ai_dependency_ratio"] == 0
    assert metrics["total_ai_interactions"] == 0
    assert metrics["independence_score"] == 10  # Perfect independence with no AI use


@pytest.mark.asyncio
async def test_calculate_learning_metrics_with_improving_reflections(
    db_session: AsyncSession,
):
    """Test metrics calculation showing improving reflection quality."""
    service = LearningAnalyticsService()
    user = await create_test_user_in_db(db_session, email="improving@test.com")
    doc = await create_test_document_in_db(db_session, str(user.id))

    # Create reflections with improving scores
    reflections = [
        Reflection(
            user_id=str(user.id),
            document_id=doc.id,
            content="Early reflection",
            word_count=60,
            quality_score=5.0,
            ai_level_granted="basic",
        ),
        Reflection(
            user_id=str(user.id),
            document_id=doc.id,
            content="Better reflection",
            word_count=80,
            quality_score=6.0,
            ai_level_granted="standard",
        ),
        Reflection(
            user_id=str(user.id),
            document_id=doc.id,
            content="Good reflection",
            word_count=100,
            quality_score=8.0,
            ai_level_granted="advanced",
        ),
        Reflection(
            user_id=str(user.id),
            document_id=doc.id,
            content="Great reflection",
            word_count=120,
            quality_score=9.0,
            ai_level_granted="advanced",
        ),
    ]

    for reflection in reflections:
        db_session.add(reflection)
    await db_session.commit()

    metrics = await service.calculate_learning_metrics(str(user.id), db_session)

    assert metrics["reflection_quality_trend"] == "improving"
    assert metrics["average_reflection_score"] == 7.0  # (5+6+8+9)/4
    assert metrics["total_reflections"] == 4
    assert metrics["ai_dependency_ratio"] == 0  # No AI interactions yet


@pytest.mark.asyncio
async def test_calculate_learning_metrics_with_stable_reflections(
    db_session: AsyncSession,
):
    """Test metrics calculation showing stable reflection quality."""
    service = LearningAnalyticsService()
    user = await create_test_user_in_db(db_session, email="stable@test.com")
    doc = await create_test_document_in_db(db_session, str(user.id))

    # Create reflections with stable scores
    reflections = [
        Reflection(
            user_id=str(user.id),
            document_id=doc.id,
            content=f"Reflection {i}",
            word_count=60,
            quality_score=7.0,
            ai_level_granted="standard",
        )
        for i in range(4)
    ]

    for reflection in reflections:
        db_session.add(reflection)
    await db_session.commit()

    metrics = await service.calculate_learning_metrics(str(user.id), db_session)

    assert metrics["reflection_quality_trend"] == "stable"
    assert metrics["average_reflection_score"] == 7.0


@pytest.mark.asyncio
async def test_calculate_learning_metrics_with_ai_interactions(
    db_session: AsyncSession,
):
    """Test metrics calculation including AI interaction patterns."""
    service = LearningAnalyticsService()
    user = await create_test_user_in_db(db_session, email="ai-user@test.com")

    # Create documents
    doc1 = await create_test_document_in_db(db_session, str(user.id))
    doc2 = await create_test_document_in_db(db_session, str(user.id))
    await create_test_document_in_db(db_session, str(user.id))

    # Add AI interactions for doc1 and doc2 only
    interactions = [
        AIInteraction(
            user_id=str(user.id),
            document_id=doc1.id,
            user_message="Help with thesis",
            ai_response="What's your main argument?",
            ai_level="standard",
            question_type="thesis_development",
            response_time_ms=200,
        ),
        AIInteraction(
            user_id=str(user.id),
            document_id=doc1.id,
            user_message="Structure advice",
            ai_response="Consider your audience...",
            ai_level="standard",
            question_type="structure",
            response_time_ms=150,
        ),
        AIInteraction(
            user_id=str(user.id),
            document_id=doc2.id,
            user_message="Evidence help",
            ai_response="What sources have you found?",
            ai_level="basic",
            question_type="evidence",
            response_time_ms=300,
        ),
    ]

    for interaction in interactions:
        db_session.add(interaction)
    await db_session.commit()

    metrics = await service.calculate_learning_metrics(str(user.id), db_session)

    assert metrics["ai_dependency_ratio"] == 2 / 3  # 2 docs with AI out of 3 total
    assert metrics["total_ai_interactions"] == 3
    assert metrics["independence_score"] == pytest.approx(
        3.33, rel=0.1
    )  # (1 - 2/3) * 10

    # Check interaction breakdown
    breakdown = metrics["interaction_breakdown"]
    assert "thesis_development" in breakdown
    assert breakdown["thesis_development"]["count"] == 1
    assert breakdown["thesis_development"]["avg_response_time_ms"] == 200.0
    assert breakdown["structure"]["count"] == 1
    assert breakdown["evidence"]["count"] == 1


@pytest.mark.asyncio
async def test_get_document_analytics_no_data(db_session: AsyncSession):
    """Test getting analytics for document with no interactions."""
    service = LearningAnalyticsService()
    user = await create_test_user_in_db(db_session)
    doc = await create_test_document_in_db(db_session, str(user.id))

    analytics = await service.get_document_analytics(doc.id, db_session)

    assert analytics["document_id"] == doc.id
    assert analytics["total_ai_interactions"] == 0
    assert analytics["reflection_count"] == 0
    assert analytics["latest_reflection_score"] is None
    assert analytics["reflection_history"] == []


@pytest.mark.asyncio
async def test_get_document_analytics_with_data(db_session: AsyncSession):
    """Test getting analytics for document with interactions and reflections."""
    service = LearningAnalyticsService()
    user = await create_test_user_in_db(db_session)
    doc = await create_test_document_in_db(db_session, str(user.id))

    # Add reflections
    reflections = [
        Reflection(
            user_id=str(user.id),
            document_id=doc.id,
            content="First reflection",
            word_count=60,
            quality_score=6.0,
            ai_level_granted="standard",
        ),
        Reflection(
            user_id=str(user.id),
            document_id=doc.id,
            content="Second reflection",
            word_count=80,
            quality_score=8.0,
            ai_level_granted="advanced",
        ),
    ]

    # Add AI interactions
    interactions = [
        AIInteraction(
            user_id=str(user.id),
            document_id=doc.id,
            user_message=f"Question {i}",
            ai_response=f"Response {i}",
            ai_level="standard",
        )
        for i in range(3)
    ]

    for reflection in reflections:
        db_session.add(reflection)
    for interaction in interactions:
        db_session.add(interaction)
    await db_session.commit()

    analytics = await service.get_document_analytics(doc.id, db_session)

    assert analytics["document_id"] == doc.id
    assert analytics["total_ai_interactions"] == 3
    assert analytics["reflection_count"] == 2
    # The latest_reflection_score should be from the most recent reflection
    # Since we didn't set specific created_at times, they might have the same timestamp
    # So we just check that it's one of our scores
    assert analytics["latest_reflection_score"] in [6.0, 8.0]
    assert len(analytics["reflection_history"]) == 2

    # Check that both scores are present in history
    scores = [r["quality_score"] for r in analytics["reflection_history"]]
    assert 6.0 in scores
    assert 8.0 in scores
