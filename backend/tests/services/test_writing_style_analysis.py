"""Test suite for Writing Style Analysis feature"""

from unittest.mock import AsyncMock, patch

import pytest

from app.services.socratic_ai import SocraticAI


@pytest.mark.asyncio
async def test_analyze_writing_style_identifies_patterns():
    """Writing style analysis should identify key style patterns"""
    ai = SocraticAI()

    sample_text = """
    The implementation of sustainable energy policies has become increasingly important
    in recent years. Many experts believe that transitioning to renewable energy sources
    is essential for combating climate change. However, the economic implications of
    such transitions remain a topic of debate.
    """

    with patch.object(
        ai.openai_client.chat.completions, "create", new_callable=AsyncMock
    ) as mock_create:
        # Create a proper mock response structure
        mock_response = AsyncMock()
        mock_response.choices = [
            AsyncMock(
                message=AsyncMock(
                    content="""Style patterns identified:
                - Formal academic tone
                - Use of passive voice
                - Complex sentence structures
                - Technical vocabulary
                - Balanced argumentation"""
                )
            )
        ]
        mock_create.return_value = mock_response

        style_analysis = await ai.analyze_writing_style(sample_text)

        assert "patterns" in style_analysis
        assert "tone" in style_analysis
        assert "sentence_complexity" in style_analysis
        assert "vocabulary_level" in style_analysis
        assert style_analysis["tone"] == "formal_academic"


@pytest.mark.asyncio
async def test_style_analysis_generates_improvement_questions():
    """Style analysis should generate Socratic questions for improvement"""
    ai = SocraticAI()

    sample_text = (
        "I think that maybe the environment is important and we should do something."
    )

    with patch.object(
        ai.openai_client.chat.completions, "create", new_callable=AsyncMock
    ) as mock_create:
        # Create a proper mock response structure
        mock_response = AsyncMock()
        mock_response.choices = [
            AsyncMock(
                message=AsyncMock(
                    content="""Questions to improve your writing style:
                1. What specific aspects of the environment are you concerned about?
                2. When you say "we should do something," who specifically do you mean by "we"?
                3. How might you strengthen your opening to be more assertive and specific?"""
                )
            )
        ]
        mock_create.return_value = mock_response

        questions = await ai.generate_style_improvement_questions(
            sample_text, style_patterns={"tone": "informal", "clarity": "vague"}
        )

        assert len(questions) >= 2
        assert all("?" in q for q in questions)
        assert not any(
            "rewrite" in q.lower() or "change to" in q.lower() for q in questions
        )


@pytest.mark.asyncio
async def test_style_analysis_respects_socratic_boundaries():
    """Style analysis must never provide rewritten content"""
    ai = SocraticAI()

    poor_style_text = "its really bad when people dont care about stuff"

    with patch.object(
        ai.openai_client.chat.completions, "create", new_callable=AsyncMock
    ) as mock_create:
        # Test that even with poor style, AI asks questions rather than rewriting
        # Create a proper mock response structure
        mock_response = AsyncMock()
        mock_response.choices = [
            AsyncMock(
                message=AsyncMock(
                    content="""Consider these questions about your writing:
                1. What specific examples illustrate when people don't care?
                2. How might punctuation help clarify your meaning?
                3. What makes this issue important to you personally?"""
                )
            )
        ]
        mock_create.return_value = mock_response

        response = await ai.provide_style_feedback(poor_style_text, ai_level="advanced")

        # Verify no rewritten content is provided
        assert "it is" not in response.lower()  # No corrections
        assert "should be" not in response.lower()  # No prescriptive changes
        assert "?" in response  # Contains questions


@pytest.mark.asyncio
async def test_style_analysis_tracks_evolution():
    """Style analysis should track writing style evolution over time"""
    ai = SocraticAI()

    writing_samples = [
        {
            "version": 1,
            "text": "climate change bad. need fix now.",
            "timestamp": "2024-01-01",
        },
        {
            "version": 2,
            "text": "Climate change is a serious problem that needs immediate attention.",
            "timestamp": "2024-01-15",
        },
        {
            "version": 3,
            "text": "The escalating climate crisis demands urgent, coordinated global action "
            "to mitigate its devastating impacts on ecosystems and human societies.",
            "timestamp": "2024-02-01",
        },
    ]

    with patch.object(
        ai.openai_client.chat.completions, "create", new_callable=AsyncMock
    ) as mock_create:
        # Create a proper mock response structure
        mock_response = AsyncMock()
        mock_response.choices = [
            AsyncMock(
                message=AsyncMock(
                    content="""Style evolution observed:
                - Sentence complexity: simple → compound → complex
                - Vocabulary: basic → intermediate → sophisticated
                - Tone: informal → formal → academic
                - Clarity: improving consistently"""
                )
            )
        ]
        mock_create.return_value = mock_response

        evolution = await ai.analyze_style_evolution(writing_samples)

        assert "improvements" in evolution
        assert "areas_of_growth" in evolution
        assert "current_strengths" in evolution
        assert evolution["overall_trend"] == "improving"


@pytest.mark.asyncio
async def test_style_feedback_adapts_to_ai_level():
    """Style feedback should adapt based on AI level"""
    ai = SocraticAI()

    sample_text = "The protagonist's journey symbolizes humanity's eternal struggle."

    # Test basic level
    with patch.object(
        ai.openai_client.chat.completions, "create", new_callable=AsyncMock
    ) as mock_create:
        mock_response = AsyncMock()
        mock_response.choices = [
            AsyncMock(
                message=AsyncMock(
                    content="What do you mean by 'eternal struggle'? Can you give an example?"
                )
            )
        ]
        mock_create.return_value = mock_response

        basic_response = await ai.provide_style_feedback(sample_text, ai_level="basic")
        assert "what do you mean" in basic_response.lower()

    # Test advanced level
    with patch.object(
        ai.openai_client.chat.completions, "create", new_callable=AsyncMock
    ) as mock_create:
        mock_response = AsyncMock()
        mock_response.choices = [
            AsyncMock(
                message=AsyncMock(
                    content="How might varying your sentence rhythm enhance the philosophical weight of your metaphor?"
                )
            )
        ]
        mock_create.return_value = mock_response

        advanced_response = await ai.provide_style_feedback(
            sample_text, ai_level="advanced"
        )
        assert (
            "sentence rhythm" in advanced_response
            or "philosophical" in advanced_response
        )


@pytest.mark.asyncio
async def test_style_analysis_handles_different_genres():
    """Style analysis should recognize and adapt to different writing genres"""
    ai = SocraticAI()

    # Test narrative style
    narrative_text = "Sarah walked slowly through the misty forest, her heart pounding with each step."

    with patch.object(
        ai.openai_client.chat.completions, "create", new_callable=AsyncMock
    ) as mock_create:
        mock_response = AsyncMock()
        mock_response.choices = [
            AsyncMock(
                message=AsyncMock(
                    content="""For narrative writing:
                1. What sensory details could help readers feel the mist?
                2. What is causing Sarah's heart to pound?"""
                )
            )
        ]
        mock_create.return_value = mock_response

        narrative_feedback = await ai.provide_style_feedback(
            narrative_text, ai_level="standard", genre="narrative"
        )
        assert "sensory" in narrative_feedback or "feel" in narrative_feedback

    # Test argumentative style
    argumentative_text = (
        "School uniforms should be mandatory because they promote equality."
    )

    with patch.object(
        ai.openai_client.chat.completions, "create", new_callable=AsyncMock
    ) as mock_create:
        mock_response = AsyncMock()
        mock_response.choices = [
            AsyncMock(
                message=AsyncMock(
                    content="""For argumentative writing:
                1. What evidence supports your claim about equality?
                2. How might opponents challenge this reasoning?"""
                )
            )
        ]
        mock_create.return_value = mock_response

        argumentative_feedback = await ai.provide_style_feedback(
            argumentative_text, ai_level="standard", genre="argumentative"
        )
        assert (
            "evidence" in argumentative_feedback
            or "opponents" in argumentative_feedback
        )


@pytest.mark.asyncio
async def test_style_metrics_calculation():
    """Style analysis should calculate quantifiable metrics"""
    ai = SocraticAI()

    sample_text = """
    The quick brown fox jumps over the lazy dog. This pangram contains every letter.
    It is often used for testing. Many people know this sentence.
    """

    metrics = await ai.calculate_style_metrics(sample_text)

    assert "avg_sentence_length" in metrics
    assert "vocabulary_diversity" in metrics
    assert "readability_score" in metrics
    assert metrics["avg_sentence_length"] > 0
    assert 0 <= metrics["vocabulary_diversity"] <= 1
    assert metrics["readability_score"] > 0


@pytest.mark.asyncio
async def test_style_comparison_with_goals():
    """Style analysis should compare current writing with stated goals"""
    ai = SocraticAI()

    current_text = "The data shows a clear trend in user behavior."
    style_goal = "academic_formal"

    with patch.object(
        ai.openai_client.chat.completions, "create", new_callable=AsyncMock
    ) as mock_create:
        mock_response = AsyncMock()
        mock_response.choices = [
            AsyncMock(
                message=AsyncMock(
                    content="""Comparing to academic formal style:
                1. How might you make 'clear trend' more precise?
                2. What specific data are you referencing?
                3. Could you strengthen this claim with citations?"""
                )
            )
        ]
        mock_create.return_value = mock_response

        comparison = await ai.compare_style_with_goal(current_text, style_goal)

        assert "alignment_score" in comparison
        assert "improvement_questions" in comparison
        assert len(comparison["improvement_questions"]) >= 2


@pytest.mark.asyncio
async def test_style_analysis_prevents_content_generation():
    """Style analysis must never generate content for students"""
    ai = SocraticAI()

    request = "Fix this sentence for me: 'Me and him went to store yesterday.'"

    with patch.object(
        ai.openai_client.chat.completions, "create", new_callable=AsyncMock
    ) as mock_create:
        mock_response = AsyncMock()
        mock_response.choices = [
            AsyncMock(
                message=AsyncMock(
                    content="""Instead of fixing it for you, consider:
                1. Who should come first when listing yourself with others?
                2. What's the difference between subject and object pronouns?
                3. How do you know which pronoun form to use?"""
                )
            )
        ]
        mock_create.return_value = mock_response

        response = await ai.provide_style_feedback(
            request, ai_level="standard", detect_fix_request=True
        )

        # Verify no corrected sentence is provided
        assert "He and I" not in response
        assert "the store" not in response
        assert "?" in response  # Contains guiding questions
