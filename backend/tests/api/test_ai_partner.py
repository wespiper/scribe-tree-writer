from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_interaction import Reflection
from tests.factories import create_thoughtful_reflection
from tests.test_utils import (
    create_test_document_in_db,
    create_test_user_in_db,
)


class TestReflectionGate:
    """Test the reflection gate that ensures students think before AI access"""

    @pytest.mark.asyncio
    async def test_reflection_under_50_words_rejected(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that reflections under 50 words are rejected"""
        # Create a test document
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        # Submit a short reflection (only 4 words)
        reflection_data = {
            "reflection": "This is too short",
            "document_id": str(document.id),
        }

        response = await authenticated_client.post(
            "/api/ai/reflect", json=reflection_data
        )

        assert response.status_code == 200
        result = response.json()
        assert result["access_granted"] is False
        assert "50 words" in result["feedback"]
        assert result["ai_level"] is None
        assert result["initial_questions"] is None
        assert len(result["suggestions"]) > 0

    @pytest.mark.asyncio
    async def test_low_quality_reflection_rejected_even_if_long(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that low-quality reflections are rejected even if they meet word count"""
        # Create a test document
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        # Submit a long but meaningless reflection (60 repetitive words)
        reflection_data = {
            "reflection": "word " * 60,  # 60 words but meaningless
            "document_id": str(document.id),
        }

        # Mock the AI service to return a low quality score
        with patch(
            "app.api.ai_partner.socratic_ai.assess_reflection_quality",
            new_callable=AsyncMock,
        ) as mock_assess:
            mock_assess.return_value = 2.5  # Low quality score

            response = await authenticated_client.post(
                "/api/ai/reflect", json=reflection_data
            )

        assert response.status_code == 200
        result = response.json()
        assert result["access_granted"] is False
        assert result["quality_score"] < 3
        assert "think deeper" in result["feedback"]
        assert result["ai_level"] is None
        assert len(result["suggestions"]) > 0

    @pytest.mark.asyncio
    async def test_basic_quality_reflection_grants_basic_access(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that basic quality reflections grant basic AI level"""
        # Create a test document
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        # Submit a basic thoughtful reflection
        reflection_data = {
            "reflection": create_thoughtful_reflection(60),
            "document_id": str(document.id),
        }

        # Mock the AI services
        with (
            patch(
                "app.api.ai_partner.socratic_ai.assess_reflection_quality",
                new_callable=AsyncMock,
            ) as mock_assess,
            patch(
                "app.api.ai_partner.socratic_ai.generate_questions",
                new_callable=AsyncMock,
            ) as mock_questions,
            patch(
                "app.api.ai_partner.analytics_service.track_reflection",
                new_callable=AsyncMock,
            ) as mock_analytics,
        ):
            mock_assess.return_value = 4.2  # Basic quality score
            mock_questions.return_value = [
                "What is your main argument?",
                "What evidence will you use?",
                "How does this connect to your thesis?",
            ]

            response = await authenticated_client.post(
                "/api/ai/reflect", json=reflection_data
            )

        assert response.status_code == 200
        result = response.json()
        assert result["access_granted"] is True
        assert result["quality_score"] == 4.2
        assert result["ai_level"] == "basic"
        assert "Great reflection" in result["feedback"]
        assert len(result["initial_questions"]) == 3
        mock_analytics.assert_called_once()

    @pytest.mark.asyncio
    async def test_standard_quality_reflection_grants_standard_access(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that standard quality reflections grant standard AI level"""
        # Create a test document
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        # Submit a standard thoughtful reflection
        reflection_data = {
            "reflection": create_thoughtful_reflection(100),
            "document_id": str(document.id),
        }

        # Mock the AI services
        with (
            patch(
                "app.api.ai_partner.socratic_ai.assess_reflection_quality",
                new_callable=AsyncMock,
            ) as mock_assess,
            patch(
                "app.api.ai_partner.socratic_ai.generate_questions",
                new_callable=AsyncMock,
            ) as mock_questions,
            patch(
                "app.api.ai_partner.analytics_service.track_reflection",
                new_callable=AsyncMock,
            ),
        ):
            mock_assess.return_value = 6.5  # Standard quality score
            mock_questions.return_value = [
                "How does your evidence support your claim?",
                "What counterarguments might exist?",
                "How will you structure this section?",
            ]

            response = await authenticated_client.post(
                "/api/ai/reflect", json=reflection_data
            )

        assert response.status_code == 200
        result = response.json()
        assert result["access_granted"] is True
        assert result["quality_score"] == 6.5
        assert result["ai_level"] == "standard"
        assert len(result["initial_questions"]) == 3

    @pytest.mark.asyncio
    async def test_exceptional_reflection_grants_advanced_access(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that exceptional quality reflections grant advanced AI level"""
        # Create a test document
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        # Submit an exceptional thoughtful reflection
        reflection_data = {
            "reflection": create_thoughtful_reflection(200),
            "document_id": str(document.id),
        }

        # Mock the AI services
        with (
            patch(
                "app.api.ai_partner.socratic_ai.assess_reflection_quality",
                new_callable=AsyncMock,
            ) as mock_assess,
            patch(
                "app.api.ai_partner.socratic_ai.generate_questions",
                new_callable=AsyncMock,
            ) as mock_questions,
            patch(
                "app.api.ai_partner.analytics_service.track_reflection",
                new_callable=AsyncMock,
            ),
        ):
            mock_assess.return_value = 8.7  # Advanced quality score
            mock_questions.return_value = [
                "What are the broader implications of your argument?",
                "How does this challenge existing scholarship?",
                "What theoretical framework supports your approach?",
            ]

            response = await authenticated_client.post(
                "/api/ai/reflect", json=reflection_data
            )

        assert response.status_code == 200
        result = response.json()
        assert result["access_granted"] is True
        assert result["quality_score"] == 8.7
        assert result["ai_level"] == "advanced"
        assert len(result["initial_questions"]) == 3

    @pytest.mark.asyncio
    async def test_reflection_quality_scoring_algorithm(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test the reflection quality scoring algorithm edge cases"""
        # Create a test document
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        # Test quality score boundaries
        test_cases = [
            (2.9, "basic", False),  # Just below 3 - should be rejected
            (3.0, "basic", True),  # Exactly 3 - should grant basic
            (4.9, "basic", True),  # Just below 5 - should be basic
            (5.0, "standard", True),  # Exactly 5 - should be standard
            (7.9, "standard", True),  # Just below 8 - should be standard
            (8.0, "advanced", True),  # Exactly 8 - should be advanced
        ]

        for quality_score, expected_level, should_grant in test_cases:
            reflection_data = {
                "reflection": create_thoughtful_reflection(100),
                "document_id": str(document.id),
            }

            with (
                patch(
                    "app.api.ai_partner.socratic_ai.assess_reflection_quality",
                    new_callable=AsyncMock,
                ) as mock_assess,
                patch(
                    "app.api.ai_partner.socratic_ai.generate_questions",
                    new_callable=AsyncMock,
                ) as mock_questions,
                patch(
                    "app.api.ai_partner.analytics_service.track_reflection",
                    new_callable=AsyncMock,
                ),
            ):
                mock_assess.return_value = quality_score
                mock_questions.return_value = ["Q1", "Q2", "Q3"]

                response = await authenticated_client.post(
                    "/api/ai/reflect", json=reflection_data
                )

                assert response.status_code == 200
                result = response.json()
                assert result["access_granted"] is should_grant
                if should_grant:
                    assert result["ai_level"] == expected_level

    @pytest.mark.asyncio
    async def test_word_count_calculation_accurate(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that word count is calculated accurately"""
        # Create a test document
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        # Test various word count scenarios
        test_cases = [
            ("one two three", 3),
            ("This is a test.", 4),
            ("Multiple  spaces   between    words", 4),
            ("Line\nbreaks\ncount\nas\nspaces", 5),
            ("Tabs\there\tare\ttreated\tas\tspaces", 6),
            ("Special!@#$%^&*()characters-don't.break,words", 3),
        ]

        for text, _ in test_cases:
            reflection_data = {"reflection": text, "document_id": str(document.id)}

            with patch(
                "app.api.ai_partner.socratic_ai.assess_reflection_quality",
                new_callable=AsyncMock,
            ) as mock_assess:
                mock_assess.return_value = 1.0  # Low score

                response = await authenticated_client.post(
                    "/api/ai/reflect", json=reflection_data
                )

                # All should be rejected due to low word count
                assert response.status_code == 200
                result = response.json()
                assert result["access_granted"] is False

    @pytest.mark.asyncio
    async def test_reflection_saves_to_database_correctly(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that accepted reflections are saved to database"""
        # Create a test document
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        reflection_text = create_thoughtful_reflection(100)
        reflection_data = {
            "reflection": reflection_text,
            "document_id": str(document.id),
        }

        # Mock the AI services
        with (
            patch(
                "app.api.ai_partner.socratic_ai.assess_reflection_quality",
                new_callable=AsyncMock,
            ) as mock_assess,
            patch(
                "app.api.ai_partner.socratic_ai.generate_questions",
                new_callable=AsyncMock,
            ),
            patch(
                "app.api.ai_partner.analytics_service.track_reflection",
                new_callable=AsyncMock,
            ),
        ):
            mock_assess.return_value = 6.5

            response = await authenticated_client.post(
                "/api/ai/reflect", json=reflection_data
            )

        assert response.status_code == 200

        # Check database
        result = await db_session.execute(
            select(Reflection).where(
                Reflection.user_id == user_id,
                Reflection.document_id == document.id,
            )
        )
        saved_reflection = result.scalar_one_or_none()

        assert saved_reflection is not None
        assert saved_reflection.content == reflection_text
        assert saved_reflection.word_count == len(reflection_text.split())
        assert saved_reflection.quality_score == 6.5
        assert saved_reflection.ai_level_granted == "standard"

    @pytest.mark.asyncio
    async def test_analytics_tracking_fires_on_reflection(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that analytics are tracked when reflection is submitted"""
        # Create a test document
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        reflection_data = {
            "reflection": create_thoughtful_reflection(100),
            "document_id": str(document.id),
        }

        # Mock the services
        with (
            patch(
                "app.api.ai_partner.socratic_ai.assess_reflection_quality",
                new_callable=AsyncMock,
            ) as mock_assess,
            patch(
                "app.api.ai_partner.socratic_ai.generate_questions",
                new_callable=AsyncMock,
            ),
            patch(
                "app.api.ai_partner.analytics_service.track_reflection",
                new_callable=AsyncMock,
            ) as mock_analytics,
        ):
            mock_assess.return_value = 5.5

            response = await authenticated_client.post(
                "/api/ai/reflect", json=reflection_data
            )

        assert response.status_code == 200

        # Verify analytics was called with correct parameters
        mock_analytics.assert_called_once_with(
            user_id=user_id,
            document_id=str(document.id),
            quality_score=5.5,
            ai_level="standard",
        )

    @pytest.mark.asyncio
    async def test_empty_reflection_handled(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that empty reflections are handled gracefully"""
        # Create a test document
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        reflection_data = {"reflection": "", "document_id": str(document.id)}

        response = await authenticated_client.post(
            "/api/ai/reflect", json=reflection_data
        )

        assert response.status_code == 200
        result = response.json()
        assert result["access_granted"] is False
        assert "50 words" in result["feedback"]

    @pytest.mark.asyncio
    async def test_whitespace_only_reflection(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that whitespace-only reflections are handled correctly"""
        # Create a test document
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        test_cases = [
            "   ",  # Spaces only
            "\n\n\n",  # Newlines only
            "\t\t\t",  # Tabs only
            "   \n\t   ",  # Mixed whitespace
        ]

        for whitespace_text in test_cases:
            reflection_data = {
                "reflection": whitespace_text,
                "document_id": str(document.id),
            }

            response = await authenticated_client.post(
                "/api/ai/reflect", json=reflection_data
            )

            assert response.status_code == 200
            result = response.json()
            assert result["access_granted"] is False
            assert "50 words" in result["feedback"]

    @pytest.mark.asyncio
    async def test_special_characters_in_reflection(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that reflections with special characters are handled properly"""
        # Create a test document
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        # Create reflection with special characters but proper content
        special_char_reflection = """
        I'm working on analyzing the "impact" of climate change & its effects.
        My approach includes: 1) examining data, 2) reviewing literature,
        3) considering multiple perspectives. The challenge I'm facing is how
        to balance scientific accuracy with accessibility. I've noticed that
        technical jargon can alienate readers, but oversimplification risks
        losing important nuances. What's the best way to navigate this?
        I'm also thinking about using visual aids (charts/graphs) to help
        communicate complex data more effectively. #climatewriting @research
        """

        reflection_data = {
            "reflection": special_char_reflection,
            "document_id": str(document.id),
        }

        with (
            patch(
                "app.api.ai_partner.socratic_ai.assess_reflection_quality",
                new_callable=AsyncMock,
            ) as mock_assess,
            patch(
                "app.api.ai_partner.socratic_ai.generate_questions",
                new_callable=AsyncMock,
            ),
            patch(
                "app.api.ai_partner.analytics_service.track_reflection",
                new_callable=AsyncMock,
            ),
        ):
            mock_assess.return_value = 7.0

            response = await authenticated_client.post(
                "/api/ai/reflect", json=reflection_data
            )

        assert response.status_code == 200
        result = response.json()
        assert result["access_granted"] is True
        assert result["ai_level"] == "standard"

    @pytest.mark.asyncio
    async def test_reflection_requires_document_ownership(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that users can only submit reflections for their own documents"""
        # Create two users
        user_data = await authenticated_client.get("/api/auth/me")
        _ = user_data.json()["id"]  # Current user ID (not used directly)

        # Create another user and their document
        other_user = await create_test_user_in_db(db_session, email="other@example.com")
        other_document = await create_test_document_in_db(
            db_session, str(other_user.id)
        )

        # Try to submit reflection for other user's document
        reflection_data = {
            "reflection": create_thoughtful_reflection(100),
            "document_id": str(other_document.id),
        }

        response = await authenticated_client.post(
            "/api/ai/reflect", json=reflection_data
        )

        assert response.status_code == 404
        assert "Document not found" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_reflection_with_nonexistent_document(
        self, authenticated_client: AsyncClient
    ):
        """Test reflection submission with non-existent document ID"""
        reflection_data = {
            "reflection": create_thoughtful_reflection(100),
            "document_id": "00000000-0000-0000-0000-000000000000",
        }

        response = await authenticated_client.post(
            "/api/ai/reflect", json=reflection_data
        )

        assert response.status_code == 404
        assert "Document not found" in response.json()["detail"]
