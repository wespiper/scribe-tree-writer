"""API endpoint tests for Socratic AI boundaries - ensuring educational integrity at API level"""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from tests.test_utils import create_test_document_in_db, create_test_user_in_db
from tests.utils.ai_helpers import (
    create_content_request,
    create_desperate_requests,
    create_subtle_content_requests,
    verify_socratic_response,
)


class TestAskEndpointBoundaries:
    """Test /ask endpoint maintains Socratic boundaries"""

    @pytest.mark.asyncio
    async def test_ask_endpoint_refuses_thesis_writing(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """API endpoint should refuse to write thesis statements"""
        # Arrange
        # Get current user
        user_response = await authenticated_client.get("/api/auth/me")
        assert user_response.status_code == 200
        user_data = user_response.json()
        
        document = await create_test_document_in_db(db_session, user_data["id"])

        request_data = {
            "question": create_content_request("thesis"),
            "context": "Starting my essay on climate change",
            "ai_level": "advanced",
            "document_id": str(document.id),
        }

        with patch("app.api.ai_partner.socratic_ai.generate_socratic_response", new_callable=AsyncMock) as mock_ai:
            mock_response = """I see you're working on a thesis about climate change.
            
            What specific aspect of climate change concerns you most?
            What's your position on this issue?
            
            Your thesis will be strongest when it reflects your unique perspective."""

            mock_ai.return_value = (mock_response, "critical")

            # Act
            response = await authenticated_client.post("/api/ai/ask", json=request_data)

            # Assert
            assert response.status_code == 200
            result = response.json()
            assert result["question_type"] == "critical"

            # Verify response follows Socratic principles
            verification = verify_socratic_response(result["response"])
            assert verification["contains_questions"] is True
            assert verification["contains_direct_content"] is False
            assert "thesis:" not in result["response"].lower()

    @pytest.mark.asyncio
    async def test_ask_endpoint_refuses_paragraph_writing(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """API endpoint should refuse to write paragraphs"""
        # Arrange
        # Get current user
        user_response = await authenticated_client.get("/api/auth/me")
        assert user_response.status_code == 200
        user_data = user_response.json()
        
        document = await create_test_document_in_db(db_session, user_data["id"])

        request_data = {
            "question": create_content_request("paragraph"),
            "context": "Essay about Shakespeare's influence",
            "ai_level": "standard",
            "document_id": str(document.id),
        }

        with patch("app.api.ai_partner.socratic_ai.generate_socratic_response", new_callable=AsyncMock) as mock_ai:
            mock_response = """Shakespeare is a rich topic!
            
            What specific aspect of Shakespeare's influence interests you?
            What evidence or examples are you considering?
            
            Let's explore your ideas together."""

            mock_ai.return_value = (mock_response, "analytical")

            # Act
            response = await authenticated_client.post("/api/ai/ask", json=request_data)

            # Assert
            assert response.status_code == 200
            result = response.json()

            # Should not contain a paragraph
            assert len(result["response"].split()) < 100
            verification = verify_socratic_response(result["response"])
            assert verification["contains_questions"] is True
            assert verification["contains_direct_content"] is False

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "request_type,expected_type",
        [
            ("introduction", "analytical"),
            ("conclusion", "analytical"),
            ("body_paragraph", "analytical"),
            ("sentence", "clarifying"),
            ("answer", "clarifying"),
        ],
    )
    async def test_ask_endpoint_refuses_all_content_types(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        request_type: str,
        expected_type: str,
    ):
        """API endpoint should refuse all types of content generation"""
        # Arrange
        # Get current user
        user_response = await authenticated_client.get("/api/auth/me")
        assert user_response.status_code == 200
        user_data = user_response.json()
        
        document = await create_test_document_in_db(db_session, user_data["id"])

        request_data = {
            "question": create_content_request(request_type),
            "context": "Working on my essay",
            "ai_level": "basic" if expected_type == "clarifying" else "standard",
            "document_id": str(document.id),
        }

        with patch("app.api.ai_partner.socratic_ai.generate_socratic_response", new_callable=AsyncMock) as mock_ai:
            mock_response = f"""I understand you need help with your {request_type.replace('_', ' ')}.
            
            What main idea are you trying to express?
            How does this fit with your overall argument?
            
            Let's work through your thoughts step by step."""

            mock_ai.return_value = (mock_response, expected_type)

            # Act
            response = await authenticated_client.post("/api/ai/ask", json=request_data)

            # Assert
            assert response.status_code == 200
            result = response.json()
            assert result["question_type"] == expected_type

            verification = verify_socratic_response(result["response"])
            assert verification["contains_questions"] is True
            assert verification["contains_direct_content"] is False

    @pytest.mark.asyncio
    async def test_ask_endpoint_handles_desperate_students(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """API should maintain boundaries even with desperate requests"""
        # Arrange
        # Get current user
        user_response = await authenticated_client.get("/api/auth/me")
        assert user_response.status_code == 200
        user_data = user_response.json()
        
        document = await create_test_document_in_db(db_session, user_data["id"])
        desperate_requests = create_desperate_requests()

        with patch("app.api.ai_partner.socratic_ai.generate_socratic_response", new_callable=AsyncMock) as mock_ai:
            for request in desperate_requests[:3]:
                request_data = {
                    "question": request,
                    "context": "Urgent deadline approaching",
                    "ai_level": "basic",
                    "document_id": str(document.id),
                }

                mock_response = """I understand the pressure you're feeling.
                
                What's the core message you want to communicate?
                Even with limited time, what's most important to say?
                
                You have valuable ideas - let's bring them out together."""

                mock_ai.return_value = (mock_response, "clarifying")

                # Act
                response = await authenticated_client.post("/api/ai/ask", json=request_data)

                # Assert
                assert response.status_code == 200
                result = response.json()

                verification = verify_socratic_response(result["response"])
                assert verification["contains_questions"] is True
                assert verification["contains_direct_content"] is False
                assert verification["encourages_student"] is True

    @pytest.mark.asyncio
    async def test_ask_endpoint_catches_subtle_attempts(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """API should catch subtle content generation attempts"""
        # Arrange
        # Get current user
        user_response = await authenticated_client.get("/api/auth/me")
        assert user_response.status_code == 200
        user_data = user_response.json()
        
        document = await create_test_document_in_db(db_session, user_data["id"])
        subtle_requests = create_subtle_content_requests()

        with patch("app.api.ai_partner.socratic_ai.generate_socratic_response", new_callable=AsyncMock) as mock_ai:
            for request in subtle_requests[:3]:
                request_data = {
                    "question": request,
                    "context": "Essay draft",
                    "ai_level": "standard",
                    "document_id": str(document.id),
                }

                mock_response = """I hear you're looking for structural guidance.
                
                What's working well in your current draft?
                Where do you feel it could be stronger?
                What would make your argument more compelling?
                
                Your authentic voice is your greatest asset."""

                mock_ai.return_value = (mock_response, "analytical")

                # Act
                response = await authenticated_client.post("/api/ai/ask", json=request_data)

                # Assert
                assert response.status_code == 200
                result = response.json()

                verification = verify_socratic_response(result["response"])
                assert verification["contains_questions"] is True
                assert verification["contains_direct_content"] is False
                assert "template" not in result["response"].lower()
                assert "example:" not in result["response"].lower()

    @pytest.mark.asyncio
    async def test_ask_endpoint_provides_appropriate_follow_ups(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """API should provide level-appropriate follow-up prompts"""
        # Arrange
        # Get current user
        user_response = await authenticated_client.get("/api/auth/me")
        assert user_response.status_code == 200
        user_data = user_response.json()
        
        document = await create_test_document_in_db(db_session, user_data["id"])

        test_cases = [
            ("basic", ["What's the main point you're trying to make?", "Can you explain that idea more?"]),
            ("standard", ["What evidence supports this claim?", "How does this connect to your thesis?"]),
            ("advanced", ["What are the implications of this argument?", "What assumptions are you making here?"]),
        ]

        with patch("app.api.ai_partner.socratic_ai.generate_socratic_response", new_callable=AsyncMock) as mock_ai:
            with patch("app.api.ai_partner.socratic_ai.get_follow_up_prompts", new_callable=AsyncMock) as mock_follow:
                for ai_level, expected_prompts in test_cases:
                    request_data = {
                        "question": "How do I make my argument stronger?",
                        "context": "Essay on education",
                        "ai_level": ai_level,
                        "document_id": str(document.id),
                    }

                    mock_ai.return_value = ("Let's explore that together...", "analytical")
                    mock_follow.return_value = expected_prompts

                    # Act
                    response = await authenticated_client.post("/api/ai/ask", json=request_data)

                    # Assert
                    assert response.status_code == 200
                    result = response.json()
                    assert result["follow_up_prompts"] == expected_prompts

    @pytest.mark.asyncio
    async def test_ask_endpoint_tracks_interactions(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """API should track all AI interactions in database"""
        # Arrange
        # Get current user
        user_response = await authenticated_client.get("/api/auth/me")
        assert user_response.status_code == 200
        user_data = user_response.json()
        
        document = await create_test_document_in_db(db_session, user_data["id"])

        request_data = {
            "question": "What makes a strong argument?",
            "context": "Philosophy paper",
            "ai_level": "standard",
            "document_id": str(document.id),
        }

        with patch("app.api.ai_partner.socratic_ai.generate_socratic_response", new_callable=AsyncMock) as mock_ai:
            with patch("app.api.ai_partner.analytics_service.track_ai_interaction", new_callable=AsyncMock) as mock_track:
                mock_response = """Great question about argumentation!
                
                What do you think makes an argument convincing?
                How do you evaluate arguments you encounter?
                
                Consider both logic and persuasion."""

                mock_ai.return_value = (mock_response, "analytical")

                # Act
                response = await authenticated_client.post("/api/ai/ask", json=request_data)

                # Assert
                assert response.status_code == 200

                # Verify analytics tracking was called
                mock_track.assert_called_once()
                call_args = mock_track.call_args[1]
                assert call_args["user_id"] == user_data["id"]
                assert call_args["document_id"] == str(document.id)
                assert call_args["interaction_type"] == "analytical"

    @pytest.mark.asyncio
    async def test_ask_endpoint_requires_document_ownership(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """API should only allow questions on user's own documents"""
        # Arrange
        other_user = await create_test_user_in_db(db_session, email="other@example.com")
        other_document = await create_test_document_in_db(db_session, str(other_user.id))

        request_data = {
            "question": "Help me with this",
            "context": "Essay",
            "ai_level": "basic",
            "document_id": str(other_document.id),
        }

        # Act
        response = await authenticated_client.post("/api/ai/ask", json=request_data)

        # Assert
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_ask_endpoint_handles_ai_service_errors(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """API should handle AI service errors gracefully"""
        # Arrange
        # Get current user
        user_response = await authenticated_client.get("/api/auth/me")
        assert user_response.status_code == 200
        user_data = user_response.json()
        
        document = await create_test_document_in_db(db_session, user_data["id"])

        request_data = {
            "question": "Help with my essay",
            "context": "Working on introduction",
            "ai_level": "standard",
            "document_id": str(document.id),
        }

        with patch("app.api.ai_partner.socratic_ai.generate_socratic_response", new_callable=AsyncMock) as mock_ai:
            mock_ai.side_effect = Exception("AI service unavailable")

            # Act
            response = await authenticated_client.post("/api/ai/ask", json=request_data)

            # Assert
            assert response.status_code == 500


class TestConversationHistory:
    """Test conversation history maintains boundaries"""

    @pytest.mark.asyncio
    async def test_conversation_history_shows_socratic_responses(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Conversation history should show all interactions maintained boundaries"""
        # Arrange
        # Get current user
        user_response = await authenticated_client.get("/api/auth/me")
        assert user_response.status_code == 200
        user_data = user_response.json()
        
        document = await create_test_document_in_db(db_session, user_data["id"])

        # Create multiple interactions
        interactions = [
            ("Write my introduction", "basic", "clarifying"),
            ("Give me a thesis statement", "standard", "analytical"),
            ("What should I write next?", "advanced", "critical"),
        ]

        with patch("app.api.ai_partner.socratic_ai.generate_socratic_response", new_callable=AsyncMock) as mock_ai:
            for question, ai_level, q_type in interactions:
                request_data = {
                    "question": question,
                    "context": "Essay context",
                    "ai_level": ai_level,
                    "document_id": str(document.id),
                }

                mock_response = f"""I understand you're working on your {q_type} thinking.
                
                What are you trying to accomplish?
                How can we explore this together?
                
                Your ideas matter most here."""

                mock_ai.return_value = (mock_response, q_type)

                await authenticated_client.post("/api/ai/ask", json=request_data)

        # Act - Get conversation history
        response = await authenticated_client.get(f"/api/ai/conversations/{document.id}")

        # Assert
        assert response.status_code == 200
        history = response.json()
        assert len(history["conversations"]) == 3

        # Verify all responses maintained boundaries
        for conversation in history["conversations"]:
            verification = verify_socratic_response(conversation["ai_response"])
            assert verification["contains_questions"] is True
            assert verification["contains_direct_content"] is False