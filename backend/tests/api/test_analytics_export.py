"""Tests for analytics export API endpoints"""

import csv
import io
import json
from datetime import datetime, timedelta

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
async def test_export_endpoints_require_authentication(client: AsyncClient):
    """Test that all export endpoints require authentication"""
    export_params = {"format": "csv", "data_type": "reflections"}

    response = await client.post("/api/analytics/export", json=export_params)
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]


@pytest.mark.asyncio
async def test_export_reflections_csv(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test exporting reflections in CSV format"""
    # Get current user
    user_response = await authenticated_client.get("/api/auth/me")
    user_id = user_response.json()["id"]

    # Create test data
    document = await create_test_document_in_db(db_session, user_id)
    for i in range(3):
        await create_test_reflection_in_db(
            db_session,
            str(document.id),
            reflection_text=f"Test reflection {i} " * 30,
            quality_score=5.0 + i,
        )

    # Request export
    response = await authenticated_client.post(
        "/api/analytics/export", json={"format": "csv", "data_type": "reflections"}
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    assert "attachment" in response.headers.get("content-disposition", "")

    # Verify CSV content
    csv_content = response.text
    csv_reader = csv.DictReader(io.StringIO(csv_content))
    rows = list(csv_reader)

    assert len(rows) == 3
    assert all("Document Title" in row for row in rows)
    assert all("Quality Score" in row for row in rows)


@pytest.mark.asyncio
async def test_export_reflections_json(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test exporting reflections in JSON format"""
    # Get current user
    user_response = await authenticated_client.get("/api/auth/me")
    user_id = user_response.json()["id"]

    # Create test data
    document = await create_test_document_in_db(db_session, user_id)
    await create_test_reflection_in_db(
        db_session,
        str(document.id),
        reflection_text="JSON export test " * 25,
        quality_score=7.5,
    )

    # Request export
    response = await authenticated_client.post(
        "/api/analytics/export", json={"format": "json", "data_type": "reflections"}
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/json"

    # Verify JSON content
    data = response.json()
    assert data["export_type"] == "reflections"
    assert data["user_id"] == user_id
    assert len(data["data"]) == 1


@pytest.mark.asyncio
async def test_export_reflections_pdf(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test exporting reflections in PDF format"""
    # Get current user
    user_response = await authenticated_client.get("/api/auth/me")
    user_id = user_response.json()["id"]

    # Create test data
    document = await create_test_document_in_db(db_session, user_id)
    await create_test_reflection_in_db(
        db_session,
        str(document.id),
        reflection_text="PDF export test " * 30,
        quality_score=8.0,
    )

    # Request export
    response = await authenticated_client.post(
        "/api/analytics/export", json={"format": "pdf", "data_type": "reflections"}
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment" in response.headers.get("content-disposition", "")

    # Verify PDF content starts with PDF magic number
    assert response.content.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_export_ai_interactions(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test exporting AI interactions"""
    # Get current user
    user_response = await authenticated_client.get("/api/auth/me")
    user_id = user_response.json()["id"]

    # Create test data
    document = await create_test_document_in_db(db_session, user_id)
    reflection = await create_test_reflection_in_db(
        db_session, str(document.id), reflection_text="AI interaction test " * 20
    )

    # Create AI interactions
    for i in range(2):
        await create_test_ai_interaction_in_db(
            db_session,
            str(reflection.id),
            user_question=f"Question {i}",
            ai_response=f"Response {i}",
            ai_level="standard",
        )

    # Request export
    response = await authenticated_client.post(
        "/api/analytics/export", json={"format": "csv", "data_type": "interactions"}
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"

    # Verify content
    csv_reader = csv.DictReader(io.StringIO(response.text))
    rows = list(csv_reader)
    assert len(rows) == 2


@pytest.mark.asyncio
async def test_export_writing_progress(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test exporting writing progress"""
    # Get current user
    user_response = await authenticated_client.get("/api/auth/me")
    user_id = user_response.json()["id"]

    # Create documents over time
    for i in range(3):
        await create_test_document_in_db(
            db_session,
            user_id,
            title=f"Progress Doc {i}",
            content="Test content " * (50 + i * 10),
            created_at=datetime.utcnow() - timedelta(days=i),
        )

    # Request export
    response = await authenticated_client.post(
        "/api/analytics/export", json={"format": "csv", "data_type": "progress"}
    )

    assert response.status_code == 200

    # Verify content includes daily progress
    csv_reader = csv.DictReader(io.StringIO(response.text))
    rows = list(csv_reader)
    assert len(rows) >= 1  # At least one day of progress


@pytest.mark.asyncio
async def test_export_with_date_filters(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test export with date range filtering"""
    # Get current user
    user_response = await authenticated_client.get("/api/auth/me")
    user_id = user_response.json()["id"]

    # Create data over multiple dates
    document = await create_test_document_in_db(db_session, user_id)
    today = datetime.utcnow()

    for i in range(5):
        await create_test_reflection_in_db(
            db_session,
            str(document.id),
            reflection_text=f"Dated reflection {i} " * 20,
            created_at=today - timedelta(days=i),
        )

    # Request export with date filter
    response = await authenticated_client.post(
        "/api/analytics/export",
        json={
            "format": "csv",
            "data_type": "reflections",
            "date_from": (today - timedelta(days=2)).date().isoformat(),
            "date_to": today.date().isoformat(),
        },
    )

    assert response.status_code == 200

    # Should only include last 3 days
    csv_reader = csv.DictReader(io.StringIO(response.text))
    rows = list(csv_reader)
    assert len(rows) == 3


@pytest.mark.asyncio
async def test_export_invalid_format(authenticated_client: AsyncClient):
    """Test export with invalid format returns error"""
    response = await authenticated_client.post(
        "/api/analytics/export", json={"format": "invalid", "data_type": "reflections"}
    )

    assert response.status_code == 422
    assert "Invalid export format" in response.json()["detail"]


@pytest.mark.asyncio
async def test_export_invalid_data_type(authenticated_client: AsyncClient):
    """Test export with invalid data type returns error"""
    response = await authenticated_client.post(
        "/api/analytics/export", json={"format": "csv", "data_type": "invalid"}
    )

    assert response.status_code == 422
    assert "Invalid data type" in response.json()["detail"]


@pytest.mark.asyncio
async def test_export_only_user_own_data(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test export only includes authenticated user's data"""
    # Get current user
    user_response = await authenticated_client.get("/api/auth/me")
    user_id = user_response.json()["id"]

    # Create data for current user
    user_doc = await create_test_document_in_db(db_session, user_id, title="My Doc")
    await create_test_reflection_in_db(
        db_session, str(user_doc.id), reflection_text="My reflection " * 20
    )

    # Create data for another user
    other_user = await create_test_user_in_db(db_session, email="other@test.com")
    other_doc = await create_test_document_in_db(
        db_session, str(other_user.id), title="Other Doc"
    )
    await create_test_reflection_in_db(
        db_session, str(other_doc.id), reflection_text="Other reflection " * 20
    )

    # Request export
    response = await authenticated_client.post(
        "/api/analytics/export", json={"format": "csv", "data_type": "reflections"}
    )

    assert response.status_code == 200

    # Verify only current user's data is included
    csv_reader = csv.DictReader(io.StringIO(response.text))
    rows = list(csv_reader)
    assert len(rows) == 1
    assert rows[0]["Document Title"] == "My Doc"


@pytest.mark.asyncio
async def test_export_handles_large_datasets(
    authenticated_client: AsyncClient, db_session: AsyncSession
):
    """Test export handles large datasets efficiently"""
    # Get current user
    user_response = await authenticated_client.get("/api/auth/me")
    user_id = user_response.json()["id"]

    # Create many reflections
    document = await create_test_document_in_db(db_session, user_id)
    for i in range(50):
        await create_test_reflection_in_db(
            db_session,
            str(document.id),
            reflection_text=f"Large dataset reflection {i} " * 20,
            quality_score=5.0 + (i % 5),
        )

    # Request export
    response = await authenticated_client.post(
        "/api/analytics/export", json={"format": "csv", "data_type": "reflections"}
    )

    assert response.status_code == 200

    # Verify all data is included
    csv_reader = csv.DictReader(io.StringIO(response.text))
    rows = list(csv_reader)
    assert len(rows) == 50
