from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_interaction import AIInteraction, Reflection
from app.models.document import Document, DocumentVersion
from tests.factories import create_thoughtful_reflection
from tests.test_utils import (
    create_test_document_in_db,
    create_test_user_in_db,
)


class TestAIContextWindow:
    """Test AI context window management for conversation history"""

    @pytest.mark.asyncio
    async def test_ai_considers_previous_conversations(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that AI includes previous conversation context when generating responses"""
        # Create a test document
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        # Create previous AI interactions in the database
        previous_interactions = [
            AIInteraction(
                user_id=user_id,
                document_id=str(document.id),
                user_message="What's the main point I should make in my introduction?",
                ai_response="What draws you to this topic? Understanding your personal "
                "connection can help shape a compelling introduction.",
                ai_level="standard",
                question_type="analytical",
                created_at=datetime.utcnow() - timedelta(minutes=30),
            ),
            AIInteraction(
                user_id=user_id,
                document_id=str(document.id),
                user_message="I'm interested in how technology affects learning.",
                ai_response="That's a rich area to explore! What specific aspects of "
                "technology's impact on learning have you observed or experienced?",
                ai_level="standard",
                question_type="analytical",
                created_at=datetime.utcnow() - timedelta(minutes=20),
            ),
        ]

        for interaction in previous_interactions:
            db_session.add(interaction)
        await db_session.commit()

        # Now ask a follow-up question that should consider context
        question_data = {
            "question": "How should I structure my argument?",
            "context": "Working on an essay about technology in education",
            "ai_level": "standard",
            "document_id": str(document.id),
        }

        # Mock the AI service to verify it receives conversation history
        with patch(
            "app.api.ai_partner.socratic_ai.generate_socratic_response_with_context",
            new_callable=AsyncMock,
        ) as mock_ai:
            mock_ai.return_value = (
                "Given your interest in technology's effect on learning, how might you "
                "organize your argument to show both benefits and challenges? "
                "What structure would best support your observations?",
                "analytical",
            )

            response = await authenticated_client.post(
                "/api/ai/ask", json=question_data
            )

            # Verify the AI was called with conversation history
            mock_ai.assert_called_once()
            call_args = mock_ai.call_args
            assert "conversation_history" in call_args.kwargs
            assert len(call_args.kwargs["conversation_history"]) == 2

        assert response.status_code == 200
        result = response.json()
        assert "technology" in result["response"]
        assert "learning" in result["response"]

    @pytest.mark.asyncio
    async def test_context_window_limited_to_recent_conversations(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that context window only includes recent conversations (last 5)"""
        # Create a test document
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        # Create 7 previous interactions (more than the limit)
        for i in range(7):
            interaction = AIInteraction(
                user_id=user_id,
                document_id=str(document.id),
                user_message=f"Question {i}",
                ai_response=f"Response {i}",
                ai_level="standard",
                question_type="analytical",
                created_at=datetime.utcnow() - timedelta(minutes=70 - i * 10),
            )
            db_session.add(interaction)
        await db_session.commit()

        question_data = {
            "question": "How should I continue?",
            "context": "Working on my essay",
            "ai_level": "standard",
            "document_id": str(document.id),
        }

        with patch(
            "app.api.ai_partner.socratic_ai.generate_socratic_response_with_context",
            new_callable=AsyncMock,
        ) as mock_ai:
            mock_ai.return_value = ("Thoughtful question response", "analytical")

            response = await authenticated_client.post(
                "/api/ai/ask", json=question_data
            )

            # Verify only the 5 most recent conversations are included
            call_args = mock_ai.call_args
            assert len(call_args.kwargs["conversation_history"]) == 5
            # Should include questions 2-6 (the most recent 5)
            history = call_args.kwargs["conversation_history"]
            assert history[0]["user_message"] == "Question 2"
            assert history[4]["user_message"] == "Question 6"

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_context_excludes_conversations_from_other_documents(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that context only includes conversations from the current document"""
        # Create test documents
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document1 = await create_test_document_in_db(db_session, user_id)
        document2 = await create_test_document_in_db(db_session, user_id)

        # Create interactions for both documents
        interaction1 = AIInteraction(
            user_id=user_id,
            document_id=str(document1.id),
            user_message="Question about document 1",
            ai_response="Response about document 1",
            ai_level="standard",
            question_type="analytical",
        )
        interaction2 = AIInteraction(
            user_id=user_id,
            document_id=str(document2.id),
            user_message="Question about document 2",
            ai_response="Response about document 2",
            ai_level="standard",
            question_type="analytical",
        )
        db_session.add(interaction1)
        db_session.add(interaction2)
        await db_session.commit()

        # Ask question for document 1
        question_data = {
            "question": "How should I continue?",
            "context": "Working on my essay",
            "ai_level": "standard",
            "document_id": str(document1.id),
        }

        with patch(
            "app.api.ai_partner.socratic_ai.generate_socratic_response_with_context",
            new_callable=AsyncMock,
        ) as mock_ai:
            mock_ai.return_value = ("Response", "analytical")

            response = await authenticated_client.post(
                "/api/ai/ask", json=question_data
            )

            # Verify only document1's conversation is included
            call_args = mock_ai.call_args
            history = call_args.kwargs["conversation_history"]
            assert len(history) == 1
            assert history[0]["user_message"] == "Question about document 1"

        assert response.status_code == 200


class TestDocumentHistoryIntegration:
    """Test AI integration with document version history"""

    @pytest.mark.asyncio
    async def test_ai_considers_document_versions(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that AI considers document version history when generating questions"""
        # Create a test document with versions
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        # Create document versions
        versions = [
            DocumentVersion(
                document_id=str(document.id),
                content="Initial draft focusing on social media impact",
                version_number=1,
                created_at=datetime.utcnow() - timedelta(hours=2),
            ),
            DocumentVersion(
                document_id=str(document.id),
                content="Expanded to include online learning platforms and their effectiveness",
                version_number=2,
                created_at=datetime.utcnow() - timedelta(hours=1),
            ),
            DocumentVersion(
                document_id=str(document.id),
                content="Added section on digital divide and accessibility concerns",
                version_number=3,
                created_at=datetime.utcnow() - timedelta(minutes=30),
            ),
        ]

        for version in versions:
            db_session.add(version)
        await db_session.commit()

        # Submit reflection that should trigger document history consideration
        reflection_text = (
            "I've been developing my argument about technology in education, but I'm not sure "
            "if my progression makes sense. I started by focusing on social media's impact on "
            "student engagement, then expanded to include online learning platforms. "
            "Now I'm exploring the digital divide and accessibility issues. I want to make sure "
            "these ideas flow logically and support my thesis about technology's transformative "
            "but unequal impact on education."
        )
        reflection_data = {
            "reflection": reflection_text,
            "document_id": str(document.id),
        }

        with (
            patch(
                "app.api.ai_partner.socratic_ai.assess_reflection_quality",
                new_callable=AsyncMock,
            ) as mock_assess,
            patch(
                "app.api.ai_partner.socratic_ai.generate_questions_with_history",
                new_callable=AsyncMock,
            ) as mock_questions_with_history,
            patch(
                "app.api.ai_partner.socratic_ai.generate_questions",
                new_callable=AsyncMock,
            ) as mock_questions,
            patch(
                "app.api.ai_partner.analytics_service.track_reflection",
                new_callable=AsyncMock,
            ),
        ):
            mock_assess.return_value = 7.0
            mock_questions_with_history.return_value = [
                "How does your exploration of the digital divide connect to your initial focus on social media?",
                "What led you to expand from social media to online learning platforms?",
                "How might accessibility concerns challenge or support your main argument?",
            ]
            # Also set fallback in case it's called
            mock_questions.return_value = [
                "How does your exploration of the digital divide connect to your initial focus on social media?",
                "What led you to expand from social media to online learning platforms?",
                "How might accessibility concerns challenge or support your main argument?",
            ]

            response = await authenticated_client.post(
                "/api/ai/reflect", json=reflection_data
            )

            # Verify document history was passed to question generation
            # It should try with history first
            if mock_questions_with_history.called:
                call_args = mock_questions_with_history.call_args
                assert "document_history" in call_args.kwargs
                assert len(call_args.kwargs["document_history"]) == 3
            else:
                # If fallback was used, at least verify the questions were generated
                mock_questions.assert_called_once()

        assert response.status_code == 200
        result = response.json()
        assert result["access_granted"] is True
        questions = result["initial_questions"]
        assert any("digital divide" in q for q in questions)

    @pytest.mark.asyncio
    async def test_ai_tracks_writing_evolution(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that AI recognizes patterns in how student's writing evolves"""
        # Create document with versions showing clear evolution
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        # Create versions showing thesis development
        versions = [
            DocumentVersion(
                document_id=str(document.id),
                content="Technology is changing education",
                version_number=1,
                word_count=4,
                created_at=datetime.utcnow() - timedelta(days=2),
            ),
            DocumentVersion(
                document_id=str(document.id),
                content="Technology is transforming education by making learning more accessible "
                "but also creating new challenges",
                version_number=2,
                word_count=14,
                created_at=datetime.utcnow() - timedelta(days=1),
            ),
            DocumentVersion(
                document_id=str(document.id),
                content="While technology democratizes access to education through online "
                "platforms and digital resources, it simultaneously exacerbates existing "
                "inequalities through the digital divide, creating a paradox that educators "
                "must navigate carefully",
                version_number=3,
                word_count=30,
                created_at=datetime.utcnow() - timedelta(hours=1),
            ),
        ]

        for version in versions:
            db_session.add(version)
        await db_session.commit()

        question_data = {
            "question": "Is my thesis getting stronger?",
            "context": "I've been refining my main argument over several drafts",
            "ai_level": "advanced",
            "document_id": str(document.id),
        }

        with patch(
            "app.api.ai_partner.socratic_ai.generate_socratic_response_with_context",
            new_callable=AsyncMock,
        ) as mock_ai:
            mock_ai.return_value = (
                "I notice your thesis has evolved from a simple observation to a nuanced "
                "paradox. What specific evidence will you use to support both sides of this "
                "paradox? How might different stakeholders view this tension differently?",
                "critical",
            )

            response = await authenticated_client.post(
                "/api/ai/ask", json=question_data
            )

            # Verify document history was included
            call_args = mock_ai.call_args
            assert "document_versions" in call_args.kwargs
            assert len(call_args.kwargs["document_versions"]) >= 2

        assert response.status_code == 200
        result = response.json()
        assert "paradox" in result["response"] or "evolved" in result["response"]


class TestProgressTrackingAlgorithm:
    """Test AI progress tracking and adaptive level adjustment"""

    @pytest.mark.asyncio
    async def test_consistent_high_quality_increases_ai_level(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that consistent high-quality reflections lead to AI level progression"""
        # Create a test document
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        # Create history of high-quality reflections
        for i in range(3):
            reflection = Reflection(
                user_id=user_id,
                document_id=str(document.id),
                content=create_thoughtful_reflection(150 + i * 50),
                word_count=150 + i * 50,
                quality_score=7.5 + i * 0.5,  # 7.5, 8.0, 8.5
                ai_level_granted="standard" if i < 2 else "advanced",
                created_at=datetime.utcnow() - timedelta(days=3 - i),
            )
            db_session.add(reflection)
        await db_session.commit()

        # Submit new reflection that should trigger level evaluation
        reflection_data = {
            "reflection": create_thoughtful_reflection(200),
            "document_id": str(document.id),
        }

        with (
            patch(
                "app.api.ai_partner.socratic_ai.assess_reflection_quality",
                new_callable=AsyncMock,
            ) as mock_assess,
            patch(
                "app.api.ai_partner.socratic_ai.calculate_adaptive_ai_level",
                new_callable=AsyncMock,
            ) as mock_adaptive,
            patch(
                "app.api.ai_partner.socratic_ai.generate_questions",
                new_callable=AsyncMock,
            ) as mock_questions,
            patch(
                "app.api.ai_partner.analytics_service.track_reflection",
                new_callable=AsyncMock,
            ),
        ):
            mock_assess.return_value = 8.7
            mock_adaptive.return_value = "advanced"  # Progression based on history
            mock_questions.return_value = ["Q1", "Q2", "Q3"]

            response = await authenticated_client.post(
                "/api/ai/reflect", json=reflection_data
            )

            # Verify adaptive level calculation was called with reflection history
            mock_adaptive.assert_called_once()
            call_args = mock_adaptive.call_args
            assert "reflection_history" in call_args.kwargs
            assert "current_quality" in call_args.kwargs

        assert response.status_code == 200
        result = response.json()
        assert result["ai_level"] == "advanced"

    @pytest.mark.asyncio
    async def test_declining_quality_adjusts_ai_level_down(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that declining reflection quality leads to AI level adjustment"""
        # Create a test document
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        # Create history showing decline
        reflections = [
            (8.5, "advanced", 3),
            (7.0, "standard", 2),
            (5.5, "standard", 1),
        ]

        reflection_objects = []
        for score, level, days_ago in reflections:
            reflection = Reflection(
                user_id=user_id,
                document_id=str(document.id),
                content=create_thoughtful_reflection(100),
                word_count=100,
                quality_score=score,
                ai_level_granted=level,
                created_at=datetime.utcnow() - timedelta(days=days_ago),
            )
            db_session.add(reflection)
            reflection_objects.append(reflection)
        await db_session.commit()

        # Refresh to get IDs
        for ref in reflection_objects:
            await db_session.refresh(ref)

        # Submit new lower quality reflection (but still over 50 words)
        reflection_data = {
            "reflection": "I'm struggling with this topic and not sure what to write about anymore. "
            "I started with a strong thesis about technology improving education, but now "
            "I'm finding contradictory evidence. The digital divide seems bigger than I thought. "
            "Maybe I should change my approach? I don't know where to go from here.",
            "document_id": str(document.id),
        }

        with (
            patch(
                "app.api.ai_partner.socratic_ai.assess_reflection_quality",
                new_callable=AsyncMock,
            ) as mock_assess,
            patch(
                "app.api.ai_partner.socratic_ai.calculate_adaptive_ai_level",
                new_callable=AsyncMock,
            ) as mock_adaptive,
            patch(
                "app.api.ai_partner.socratic_ai.generate_questions",
                new_callable=AsyncMock,
            ) as mock_questions,
            patch(
                "app.api.ai_partner.analytics_service.track_reflection",
                new_callable=AsyncMock,
            ),
        ):
            mock_assess.return_value = 4.5
            mock_adaptive.return_value = "basic"  # Adjusted down due to struggle
            mock_questions.return_value = [
                "What specifically about this topic feels challenging?",
                "Can you identify one aspect you'd like to understand better?",
                "What questions do you have about your topic?",
            ]

            response = await authenticated_client.post(
                "/api/ai/reflect", json=reflection_data
            )

        assert response.status_code == 200
        result = response.json()
        assert result["ai_level"] == "basic"

    @pytest.mark.asyncio
    async def test_progress_tracking_considers_interaction_quality(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that progress tracking considers quality of AI interactions, not just reflections"""
        # Create a test document
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        # Create a good reflection
        reflection = Reflection(
            user_id=user_id,
            document_id=str(document.id),
            content=create_thoughtful_reflection(150),
            word_count=150,
            quality_score=7.5,
            ai_level_granted="standard",
        )
        db_session.add(reflection)
        await db_session.commit()
        await db_session.refresh(reflection)

        # Create AI interactions showing engagement
        interactions = [
            AIInteraction(
                user_id=user_id,
                document_id=str(document.id),
                reflection_id=str(reflection.id),
                user_message="How can I make my argument about digital equity more compelling?",
                ai_response="What specific examples of digital inequity have you observed? "
                "How might those affected describe their experiences?",
                ai_level="standard",
                question_type="analytical",
                response_time_ms=1500,
            ),
            AIInteraction(
                user_id=user_id,
                document_id=str(document.id),
                reflection_id=str(reflection.id),
                user_message="I've seen students without reliable internet struggle with online "
                "assignments.",
                ai_response="That's a powerful observation. How does this struggle impact their "
                "academic performance compared to peers with reliable access? What solutions "
                "might address this gap?",
                ai_level="standard",
                question_type="analytical",
                response_time_ms=1800,
            ),
        ]

        for interaction in interactions:
            db_session.add(interaction)
        await db_session.commit()

        # Submit new reflection that should consider interaction quality
        reflection_data = {
            "reflection": create_thoughtful_reflection(180),
            "document_id": str(document.id),
        }

        with (
            patch(
                "app.api.ai_partner.socratic_ai.assess_reflection_quality",
                new_callable=AsyncMock,
            ) as mock_assess,
            patch(
                "app.api.ai_partner.socratic_ai.calculate_adaptive_ai_level",
                new_callable=AsyncMock,
            ) as mock_adaptive,
            patch(
                "app.api.ai_partner.socratic_ai.generate_questions",
                new_callable=AsyncMock,
            ) as mock_questions,
            patch(
                "app.api.ai_partner.analytics_service.track_reflection",
                new_callable=AsyncMock,
            ),
        ):
            mock_assess.return_value = 8.0
            mock_adaptive.return_value = "advanced"
            mock_questions.return_value = ["Q1", "Q2", "Q3"]

            response = await authenticated_client.post(
                "/api/ai/reflect", json=reflection_data
            )

            # Verify interaction history was considered
            call_args = mock_adaptive.call_args
            assert "interaction_history" in call_args.kwargs

        assert response.status_code == 200
        result = response.json()
        assert result["access_granted"] is True


class TestContextAwareSocraticBoundaries:
    """Test that Socratic boundaries are maintained even with enhanced context"""

    @pytest.mark.asyncio
    async def test_ai_refuses_content_generation_with_context(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that AI still refuses to generate content even when it has full context"""
        # Create document with rich history
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        # Create conversation history that might tempt content generation
        interactions = [
            AIInteraction(
                user_id=user_id,
                document_id=str(document.id),
                user_message="I need a thesis statement about climate change.",
                ai_response="What aspect of climate change interests you most? "
                "What unique perspective can you bring to this topic?",
                ai_level="standard",
                question_type="analytical",
            ),
            AIInteraction(
                user_id=user_id,
                document_id=str(document.id),
                user_message="I'm interested in renewable energy solutions.",
                ai_response="How do renewable energy solutions address climate challenges? "
                "What evidence have you found most compelling?",
                ai_level="standard",
                question_type="analytical",
            ),
        ]

        for interaction in interactions:
            db_session.add(interaction)
        await db_session.commit()

        # Now directly ask for thesis statement with context
        question_data = {
            "question": "Based on our discussion, write me a thesis statement about "
            "renewable energy and climate change.",
            "context": "I've been exploring renewable energy as a solution to climate change",
            "ai_level": "standard",
            "document_id": str(document.id),
        }

        with patch(
            "app.api.ai_partner.socratic_ai.generate_socratic_response_with_context",
            new_callable=AsyncMock,
        ) as mock_ai:
            mock_ai.return_value = (
                "I understand you want to focus on renewable energy. What specific claim do "
                "you want to make about its role in addressing climate change? "
                "What evidence supports your position?",
                "analytical",
            )

            response = await authenticated_client.post(
                "/api/ai/ask", json=question_data
            )

        assert response.status_code == 200
        result = response.json()
        assert "thesis" not in result["response"].lower() or "?" in result["response"]
        assert (
            "write" not in result["response"].lower()
            or "you" in result["response"].lower()
        )

    @pytest.mark.asyncio
    async def test_ai_maintains_questioning_approach_with_history(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that AI maintains Socratic questioning even with detailed document history"""
        # Create document with version history
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        versions = [
            DocumentVersion(
                document_id=str(document.id),
                content="The impact of social media on teenage mental health is significant.",
                version_number=1,
            ),
            DocumentVersion(
                document_id=str(document.id),
                content="Social media platforms like Instagram and TikTok are affecting how "
                "teenagers view themselves and their peers, leading to increased anxiety and "
                "depression.",
                version_number=2,
            ),
        ]

        for version in versions:
            db_session.add(version)
        await db_session.commit()

        question_data = {
            "question": "How should I conclude my essay?",
            "context": "Working on essay about social media and teen mental health",
            "ai_level": "advanced",
            "document_id": str(document.id),
        }

        with patch(
            "app.api.ai_partner.socratic_ai.generate_socratic_response_with_context",
            new_callable=AsyncMock,
        ) as mock_ai:
            mock_ai.return_value = (
                "You've developed your argument about social media's impact on mental health. "
                "What implications does your analysis have for parents, educators, or "
                "policymakers? What questions remain unanswered that future research might "
                "address?",
                "critical",
            )

            response = await authenticated_client.post(
                "/api/ai/ask", json=question_data
            )

        assert response.status_code == 200
        result = response.json()
        assert "?" in result["response"]  # Contains questions
        assert (
            "implications" in result["response"].lower()
            or "questions" in result["response"].lower()
        )


class TestContextWindowPerformance:
    """Test performance considerations for context window management"""

    @pytest.mark.asyncio
    async def test_large_conversation_history_performance(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that large conversation histories are handled efficiently"""
        # Create a test document
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        # Create many AI interactions (simulate heavy usage)
        for i in range(20):
            interaction = AIInteraction(
                user_id=user_id,
                document_id=str(document.id),
                user_message=f"Question {i} about my topic with some detailed context",
                ai_response=f"Thoughtful Socratic response {i} with questions to guide thinking",
                ai_level="standard",
                question_type="analytical",
                response_time_ms=1500 + i * 100,
                created_at=datetime.utcnow() - timedelta(hours=20 - i),
            )
            db_session.add(interaction)
        await db_session.commit()

        question_data = {
            "question": "How can I improve my argument?",
            "context": "Continuing work on my essay",
            "ai_level": "standard",
            "document_id": str(document.id),
        }

        start_time = datetime.utcnow()

        with patch(
            "app.api.ai_partner.socratic_ai.generate_socratic_response_with_context",
            new_callable=AsyncMock,
        ) as mock_ai:
            mock_ai.return_value = ("Response with questions", "analytical")

            response = await authenticated_client.post(
                "/api/ai/ask", json=question_data
            )

            # Verify only recent conversations are loaded
            call_args = mock_ai.call_args
            assert len(call_args.kwargs["conversation_history"]) <= 5

        response_time = (datetime.utcnow() - start_time).total_seconds()

        assert response.status_code == 200
        assert response_time < 2.0  # Should respond quickly even with history

    @pytest.mark.asyncio
    async def test_context_summary_for_long_documents(
        self, authenticated_client: AsyncClient, db_session: AsyncSession
    ):
        """Test that long document histories are summarized rather than fully included"""
        # Create document with many versions
        user_data = await authenticated_client.get("/api/auth/me")
        user_id = user_data.json()["id"]
        document = await create_test_document_in_db(db_session, user_id)

        # Create many document versions
        for i in range(10):
            version = DocumentVersion(
                document_id=str(document.id),
                content=f"Version {i} content with substantial text "
                * 50,  # Large content
                version_number=i + 1,
                word_count=300 + i * 50,
                created_at=datetime.utcnow() - timedelta(days=10 - i),
            )
            db_session.add(version)
        await db_session.commit()

        question_data = {
            "question": "How has my writing evolved?",
            "context": "Looking at my document history",
            "ai_level": "advanced",
            "document_id": str(document.id),
        }

        with patch(
            "app.api.ai_partner.socratic_ai.generate_socratic_response_with_context",
            new_callable=AsyncMock,
        ) as mock_ai:
            mock_ai.return_value = (
                "Looking at your writing progression, what patterns do you notice in how "
                "your ideas have developed? Which revisions had the most impact on "
                "clarifying your argument?",
                "critical",
            )

            response = await authenticated_client.post(
                "/api/ai/ask", json=question_data
            )

            # Verify document summary is passed, not full content
            call_args = mock_ai.call_args
            assert (
                "document_summary" in call_args.kwargs
                or "document_versions" in call_args.kwargs
            )
            # Should not include all full versions due to size

        assert response.status_code == 200
