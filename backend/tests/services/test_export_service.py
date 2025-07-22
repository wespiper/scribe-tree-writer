"""Tests for the export service"""

import csv
import io
import json
from datetime import datetime, timedelta
from typing import Any
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_interaction import AIInteraction, Reflection
from app.models.document import Document
from app.models.user import User
from app.services.export_service import ExportService
from tests.test_helpers import (
    create_test_ai_interaction_in_db,
    create_test_document_in_db,
    create_test_reflection_in_db,
    create_test_user_in_db,
)


@pytest.fixture
def export_service():
    """Create an export service instance"""
    return ExportService()


@pytest.mark.asyncio
async def test_export_reflections_to_csv(
    export_service: ExportService, db_session: AsyncSession
):
    """Test exporting reflections to CSV format"""
    # Create test data
    user = await create_test_user_in_db(db_session)
    document = await create_test_document_in_db(db_session, str(user.id))

    reflections = []
    for i in range(3):
        reflection = await create_test_reflection_in_db(
            db_session,
            str(document.id),
            reflection_text=f"Test reflection {i} " * 25,  # 125+ words
            quality_score=5.0 + i,
            created_at=datetime.utcnow() - timedelta(days=i),
        )
        reflections.append(reflection)

    # Export to CSV
    csv_data = await export_service.export_reflections_csv(
        db_session, user_id=str(user.id)
    )

    # Parse CSV output
    csv_reader = csv.DictReader(io.StringIO(csv_data))
    rows = list(csv_reader)

    assert len(rows) == 3
    assert all(row["Document Title"] == document.title for row in rows)
    assert all("Reflection Content" in row for row in rows)
    assert all("Quality Score" in row for row in rows)
    assert all("Word Count" in row for row in rows)
    assert all("AI Level Granted" in row for row in rows)
    assert all("Date" in row for row in rows)


@pytest.mark.asyncio
async def test_export_reflections_to_json(
    export_service: ExportService, db_session: AsyncSession
):
    """Test exporting reflections to JSON format"""
    # Create test data
    user = await create_test_user_in_db(db_session)
    document = await create_test_document_in_db(db_session, str(user.id))

    reflections = []
    for i in range(2):
        reflection = await create_test_reflection_in_db(
            db_session,
            str(document.id),
            reflection_text=f"JSON test reflection {i} " * 20,
            quality_score=6.0 + i,
            created_at=datetime.utcnow() - timedelta(hours=i),
        )
        reflections.append(reflection)

    # Export to JSON
    json_data = await export_service.export_reflections_json(
        db_session, user_id=str(user.id)
    )

    # Parse JSON output
    data = json.loads(json_data)

    assert data["export_type"] == "reflections"
    assert data["user_id"] == str(user.id)
    assert "export_date" in data
    assert len(data["data"]) == 2

    for i, reflection_data in enumerate(data["data"]):
        assert reflection_data["document_title"] == document.title
        assert "reflection_content" in reflection_data
        assert (
            reflection_data["quality_score"] == 6.0 + i
        )  # Newest first (reverse chronological)
        assert reflection_data["word_count"] > 0
        assert "ai_level_granted" in reflection_data
        assert "date" in reflection_data


@pytest.mark.asyncio
async def test_export_ai_interactions_to_csv(
    export_service: ExportService, db_session: AsyncSession
):
    """Test exporting AI interactions to CSV format"""
    # Create test data
    user = await create_test_user_in_db(db_session)
    document = await create_test_document_in_db(db_session, str(user.id))
    reflection = await create_test_reflection_in_db(
        db_session,
        str(document.id),
        reflection_text="Test reflection for AI interactions " * 10,
        quality_score=7.5,
    )

    # Create AI interactions
    interactions = []
    for i in range(3):
        interaction = await create_test_ai_interaction_in_db(
            db_session,
            str(reflection.id),
            user_question=f"Question {i}: How can I improve?",
            ai_response=f"Consider exploring aspect {i}...",
            ai_level="standard" if i < 2 else "advanced",
        )
        interactions.append(interaction)

    # Export to CSV
    csv_data = await export_service.export_ai_interactions_csv(
        db_session, user_id=str(user.id)
    )

    # Parse CSV output
    csv_reader = csv.DictReader(io.StringIO(csv_data))
    rows = list(csv_reader)

    assert len(rows) == 3
    assert all("Document Title" in row for row in rows)
    assert all("User Question" in row for row in rows)
    assert all("AI Response" in row for row in rows)
    assert all("AI Level" in row for row in rows)
    assert all("Date" in row for row in rows)


@pytest.mark.asyncio
async def test_export_writing_progress_to_csv(
    export_service: ExportService, db_session: AsyncSession
):
    """Test exporting writing progress to CSV format"""
    # Create test data
    user = await create_test_user_in_db(db_session)

    # Create documents over several days
    for i in range(5):
        await create_test_document_in_db(
            db_session,
            str(user.id),
            title=f"Progress Document {i}",
            content=f"Content for document {i} "
            * (50 + i * 10),  # Increasing word count
            created_at=datetime.utcnow() - timedelta(days=i),
        )

    # Export to CSV
    csv_data = await export_service.export_writing_progress_csv(
        db_session, user_id=str(user.id)
    )

    # Parse CSV output
    csv_reader = csv.DictReader(io.StringIO(csv_data))
    rows = list(csv_reader)

    assert len(rows) >= 1  # May be grouped by date
    assert all("Date" in row for row in rows)
    assert all("Documents Created" in row for row in rows)
    assert all("Words Written" in row for row in rows)


@pytest.mark.asyncio
async def test_export_with_date_range_filter(
    export_service: ExportService, db_session: AsyncSession
):
    """Test export with date range filtering"""
    # Create test data
    user = await create_test_user_in_db(db_session)
    document = await create_test_document_in_db(db_session, str(user.id))

    # Create reflections over different dates
    today = datetime.utcnow()
    for i in range(5):
        await create_test_reflection_in_db(
            db_session,
            str(document.id),
            reflection_text=f"Dated reflection {i} " * 20,
            quality_score=5.0 + i,
            created_at=today - timedelta(days=i * 2),
        )

    # Export with date filter (last 5 days)
    csv_data = await export_service.export_reflections_csv(
        db_session,
        user_id=str(user.id),
        start_date=(today - timedelta(days=5)).date(),
        end_date=today.date(),
    )

    # Parse CSV output
    csv_reader = csv.DictReader(io.StringIO(csv_data))
    rows = list(csv_reader)

    # Should only include reflections from last 5 days (3 reflections)
    assert len(rows) == 3


@pytest.mark.asyncio
async def test_export_handles_empty_data(
    export_service: ExportService, db_session: AsyncSession
):
    """Test export handles empty datasets gracefully"""
    # Create user with no data
    user = await create_test_user_in_db(db_session)

    # Export empty reflections
    csv_data = await export_service.export_reflections_csv(
        db_session, user_id=str(user.id)
    )

    # Should return header row only
    lines = csv_data.strip().split("\n")
    assert len(lines) == 1  # Only header
    assert "Document Title" in lines[0]


@pytest.mark.asyncio
async def test_export_only_includes_user_own_data(
    export_service: ExportService, db_session: AsyncSession
):
    """Test export only includes user's own data"""
    # Create two users with data
    user1 = await create_test_user_in_db(db_session)
    user2 = await create_test_user_in_db(db_session, email="other@test.com")

    doc1 = await create_test_document_in_db(
        db_session, str(user1.id), title="User 1 Doc"
    )
    doc2 = await create_test_document_in_db(
        db_session, str(user2.id), title="User 2 Doc"
    )

    await create_test_reflection_in_db(
        db_session, str(doc1.id), reflection_text="User 1 reflection " * 20
    )
    await create_test_reflection_in_db(
        db_session, str(doc2.id), reflection_text="User 2 reflection " * 20
    )

    # Export user1's data
    csv_data = await export_service.export_reflections_csv(
        db_session, user_id=str(user1.id)
    )

    # Parse CSV output
    csv_reader = csv.DictReader(io.StringIO(csv_data))
    rows = list(csv_reader)

    assert len(rows) == 1
    assert rows[0]["Document Title"] == "User 1 Doc"


@pytest.mark.asyncio
async def test_export_to_pdf_includes_metadata(
    export_service: ExportService, db_session: AsyncSession
):
    """Test exporting to PDF format includes proper metadata"""
    # Create test data
    user = await create_test_user_in_db(db_session)
    document = await create_test_document_in_db(db_session, str(user.id))

    await create_test_reflection_in_db(
        db_session,
        str(document.id),
        reflection_text="PDF test reflection " * 30,
        quality_score=8.0,
    )

    # Export to PDF
    pdf_data = await export_service.export_reflections_pdf(
        db_session, user_id=str(user.id)
    )

    # PDF should be bytes
    assert isinstance(pdf_data, bytes)
    assert len(pdf_data) > 0

    # PDF magic number check
    assert pdf_data.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_export_handles_large_datasets_efficiently(
    export_service: ExportService, db_session: AsyncSession
):
    """Test export handles large datasets without memory issues"""
    # Create user with many documents
    user = await create_test_user_in_db(db_session)

    # Create 100 documents (simulating large dataset)
    for i in range(100):
        doc = await create_test_document_in_db(
            db_session,
            str(user.id),
            title=f"Large Dataset Doc {i}",
            content=f"Content {i} " * 100,
        )

        # Add a reflection every 10 documents
        if i % 10 == 0:
            await create_test_reflection_in_db(
                db_session,
                str(doc.id),
                reflection_text=f"Reflection for doc {i} " * 20,
                quality_score=5.0 + (i % 5),
            )

    # Export should complete without error
    csv_data = await export_service.export_reflections_csv(
        db_session, user_id=str(user.id)
    )

    # Parse CSV output
    csv_reader = csv.DictReader(io.StringIO(csv_data))
    rows = list(csv_reader)

    assert len(rows) == 10  # Should have 10 reflections


@pytest.mark.asyncio
async def test_export_formats_dates_consistently(
    export_service: ExportService, db_session: AsyncSession
):
    """Test export formats dates consistently across formats"""
    # Create test data
    user = await create_test_user_in_db(db_session)
    document = await create_test_document_in_db(db_session, str(user.id))

    specific_date = datetime(2025, 1, 15, 10, 30, 45)
    await create_test_reflection_in_db(
        db_session,
        str(document.id),
        reflection_text="Date format test " * 20,
        quality_score=7.0,
        created_at=specific_date,
    )

    # Export to CSV
    csv_data = await export_service.export_reflections_csv(
        db_session, user_id=str(user.id)
    )

    # Export to JSON
    json_data = await export_service.export_reflections_json(
        db_session, user_id=str(user.id)
    )

    # Check date format in CSV
    csv_reader = csv.DictReader(io.StringIO(csv_data))
    csv_row = list(csv_reader)[0]
    assert "2025-01-15" in csv_row["Date"]

    # Check date format in JSON
    json_obj = json.loads(json_data)
    assert "2025-01-15" in json_obj["data"][0]["date"]
