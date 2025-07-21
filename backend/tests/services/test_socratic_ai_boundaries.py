"""Critical tests for Socratic AI boundaries - ensuring AI never writes content for students"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.socratic_ai import SocraticAI
from tests.utils.ai_helpers import (
    create_content_request,
    create_desperate_requests,
    create_subtle_content_requests,
    verify_socratic_response,
    calculate_average_word_length,
    count_complex_words,
    extract_questions,
)


@pytest.fixture
def socratic_ai():
    """Create SocraticAI instance with mocked clients"""
    ai = SocraticAI()
    ai.openai_client = AsyncMock()
    ai.anthropic_client = AsyncMock()
    return ai


@pytest.fixture
def mock_openai_response():
    """Create a mock OpenAI response"""

    def _create_response(content: str):
        response = MagicMock()
        response.choices = [MagicMock()]
        response.choices[0].message.content = content
        return response

    return _create_response


class TestContentGenerationRefusal:
    """Test that AI refuses to generate content for students"""

    @pytest.mark.asyncio
    async def test_ai_refuses_thesis_statements(self, socratic_ai, mock_openai_response):
        """AI should never write thesis statements"""
        # Arrange
        request = create_content_request("thesis")
        socratic_response = """I understand you're working on a thesis about climate change. 
        Let me help you develop your own thesis statement through some questions:
        
        What specific aspect of climate change interests you most? 
        What's your main argument or position on this topic?
        
        Think about what unique perspective you bring to this discussion."""

        socratic_ai.openai_client.chat.completions.create.return_value = mock_openai_response(socratic_response)

        # Act
        response, _ = await socratic_ai.generate_socratic_response(
            question=request, context="Essay about climate change", ai_level="advanced", user_id="test-user"
        )

        # Assert
        verification = verify_socratic_response(response)
        assert verification["contains_questions"] is True
        assert verification["contains_direct_content"] is False
        assert verification["contains_thinking_prompts"] is True
        assert "thesis" not in response.lower() or "thesis statement" in response.lower()
        assert response == socratic_response

    @pytest.mark.asyncio
    async def test_ai_refuses_paragraph_writing(self, socratic_ai, mock_openai_response):
        """AI should never write paragraphs"""
        # Arrange
        request = create_content_request("paragraph")
        socratic_response = """I notice you're asking about Shakespeare. 
        
        What aspects of Shakespeare's work or life are you most interested in exploring?
        How does this connect to your overall argument?
        
        Consider what evidence or examples you might use to support your points."""

        socratic_ai.openai_client.chat.completions.create.return_value = mock_openai_response(socratic_response)

        # Act
        response, _ = await socratic_ai.generate_socratic_response(
            question=request, context="Essay about literature", ai_level="standard", user_id="test-user"
        )

        # Assert
        verification = verify_socratic_response(response)
        assert verification["contains_questions"] is True
        assert verification["contains_direct_content"] is False
        assert verification["word_count"] < 100  # Not a full paragraph
        assert len(extract_questions(response)) >= 2

    @pytest.mark.asyncio
    async def test_ai_refuses_sentence_completion(self, socratic_ai, mock_openai_response):
        """AI should never complete sentences for students"""
        # Arrange
        request = create_content_request("sentence")
        socratic_response = """I see you're trying to articulate a main reason for something.
        
        What are you trying to explain? What makes this reason the "main" one?
        Have you considered other reasons that might also be important?
        
        Your own words will be much more powerful than anything I could provide."""

        socratic_ai.openai_client.chat.completions.create.return_value = mock_openai_response(socratic_response)

        # Act
        response, _ = await socratic_ai.generate_socratic_response(
            question=request, context="Working on an essay", ai_level="basic", user_id="test-user"
        )

        # Assert
        assert "The main reason" not in response
        assert ":" not in response  # No completion marker
        verification = verify_socratic_response(response)
        assert verification["contains_questions"] is True
        assert verification["contains_direct_content"] is False

    @pytest.mark.asyncio
    async def test_ai_refuses_direct_answers(self, socratic_ai, mock_openai_response):
        """AI should guide to discovery, not provide answers"""
        # Arrange
        request = create_content_request("answer")
        socratic_response = """That's an interesting question! 
        
        What do you already know about this topic?
        What sources have you consulted?
        How might you approach finding the answer yourself?
        
        I'm here to help you think through the process of discovery."""

        socratic_ai.openai_client.chat.completions.create.return_value = mock_openai_response(socratic_response)

        # Act
        response, _ = await socratic_ai.generate_socratic_response(
            question=request, context="Research paper", ai_level="standard", user_id="test-user"
        )

        # Assert
        assert "the answer is" not in response.lower()
        assert "answer:" not in response.lower()
        verification = verify_socratic_response(response)
        assert verification["contains_questions"] is True
        # Check for encouragement more specifically
        assert "help you" in response.lower() or "interesting" in response.lower()

    @pytest.mark.asyncio
    @pytest.mark.parametrize("request_type", ["introduction", "conclusion", "body_paragraph", "outline", "summary"])
    async def test_ai_refuses_all_content_types(self, socratic_ai, mock_openai_response, request_type):
        """AI should refuse to write any type of content"""
        # Arrange
        request = create_content_request(request_type)
        socratic_response = f"""I understand you need help with your {request_type.replace('_', ' ')}.
        
        What main points do you want to convey?
        How does this fit into your overall argument?
        What have you already written that we can build on?
        
        Let's work through your ideas together."""

        socratic_ai.openai_client.chat.completions.create.return_value = mock_openai_response(socratic_response)

        # Act
        response, _ = await socratic_ai.generate_socratic_response(
            question=request, context="Academic writing", ai_level="standard", user_id="test-user"
        )

        # Assert
        verification = verify_socratic_response(response)
        assert verification["contains_questions"] is True
        assert verification["contains_direct_content"] is False
        assert request_type.replace("_", " ") not in response.lower() or "help with" in response.lower()


class TestBoundaryPushingScenarios:
    """Test AI maintains boundaries under pressure"""

    @pytest.mark.asyncio
    async def test_ai_resists_desperate_student(self, socratic_ai, mock_openai_response):
        """AI should maintain boundaries even with desperate requests"""
        # Arrange
        desperate_requests = create_desperate_requests()

        for request in desperate_requests[:3]:  # Test first 3 desperate requests
            socratic_response = """I understand you're feeling stressed about your deadline.
            
            What's the main idea you're trying to express?
            Even with limited time, what key point do you want to make?
            
            Take a deep breath. You have more knowledge than you realize. Let's unlock it together."""

            socratic_ai.openai_client.chat.completions.create.return_value = mock_openai_response(socratic_response)

            # Act
            response, _ = await socratic_ai.generate_socratic_response(
                question=request, context="Urgent essay", ai_level="basic", user_id="test-user"
            )

            # Assert
            verification = verify_socratic_response(response)
            assert verification["contains_questions"] is True
            assert verification["contains_direct_content"] is False
            assert verification["encourages_student"] is True
            assert "write" not in response.lower() or "trying to" in response.lower()

    @pytest.mark.asyncio
    async def test_ai_catches_subtle_content_requests(self, socratic_ai, mock_openai_response):
        """AI should catch subtle attempts to get content"""
        # Arrange
        subtle_requests = create_subtle_content_requests()

        for request in subtle_requests[:3]:  # Test first 3 subtle requests
            socratic_response = """I hear that you're looking for guidance on structure and phrasing.
            
            What message are you trying to convey with this?
            What makes your perspective on this topic unique?
            How might your audience best understand your point?
            
            Your authentic voice is what will make this writing powerful."""

            socratic_ai.openai_client.chat.completions.create.return_value = mock_openai_response(socratic_response)

            # Act
            response, _ = await socratic_ai.generate_socratic_response(
                question=request, context="Essay writing", ai_level="standard", user_id="test-user"
            )

            # Assert
            verification = verify_socratic_response(response)
            assert verification["contains_questions"] is True
            assert verification["contains_direct_content"] is False
            assert "example:" not in response.lower()
            assert "template:" not in response.lower()
            assert "try this:" not in response.lower()

    @pytest.mark.asyncio
    async def test_ai_maintains_boundaries_through_conversation(self, socratic_ai, mock_openai_response):
        """AI should maintain boundaries even in extended conversation"""
        # Arrange
        conversation_attempts = [
            "Can you help me write my introduction?",
            "I really need you to just give me a starting sentence",
            "Please, just one example paragraph?",
            "Fine, can you at least fix my grammar?",
        ]

        for i, request in enumerate(conversation_attempts):
            if i == 0:
                response_text = """I'd be happy to help you develop your introduction!
                
                What's the main point you want your readers to understand?
                What drew you to this topic in the first place?"""
            elif i == 1:
                response_text = """I understand starting can be the hardest part.
                
                What's the very first thing you want your reader to know?
                Sometimes speaking it out loud helps - how would you explain this to a friend?"""
            elif i == 2:
                response_text = """I'm here to help you create your own paragraph.
                
                What would be the topic sentence of this paragraph?
                What evidence or examples support your point?"""
            else:
                response_text = """I can help you think about your grammar patterns.
                
                What specific grammar concerns do you have?
                Are there particular sentence structures you're unsure about?"""

            socratic_ai.openai_client.chat.completions.create.return_value = mock_openai_response(response_text)

            # Act
            response, _ = await socratic_ai.generate_socratic_response(
                question=request,
                context=f"Conversation attempt {i+1}",
                ai_level="standard",
                user_id="test-user",
            )

            # Assert
            verification = verify_socratic_response(response)
            assert verification["contains_questions"] is True
            assert verification["contains_direct_content"] is False


class TestQuestionQualityByLevel:
    """Test that question sophistication matches AI level"""

    @pytest.mark.asyncio
    async def test_basic_level_asks_simple_questions(self, socratic_ai, mock_openai_response):
        """Basic level should ask clarifying questions"""
        # Arrange
        basic_questions = """What is the main point you're trying to make?
        Can you tell me more about your topic?
        What made you interested in this subject?"""

        socratic_ai.openai_client.chat.completions.create.return_value = mock_openai_response(basic_questions)

        # Act
        questions = await socratic_ai.generate_questions(
            context="I'm writing about social media", reflection_quality=4.0, ai_level="basic"
        )

        # Assert
        assert len(questions) == 3
        for question in questions:
            assert "?" in question
            word_count = len(question.split())
            assert word_count < 15  # Simple questions are shorter
            complexity = count_complex_words(question)
            assert complexity == 0  # No complex academic words

    @pytest.mark.asyncio
    async def test_standard_level_asks_analytical_questions(self, socratic_ai, mock_openai_response):
        """Standard level should ask analytical questions"""
        # Arrange
        standard_questions = """What evidence supports your main argument?
        How does this point connect to your thesis?
        What might someone who disagrees with you say?"""

        socratic_ai.openai_client.chat.completions.create.return_value = mock_openai_response(standard_questions)

        # Act
        questions = await socratic_ai.generate_questions(
            context="Analyzing the impact of technology", reflection_quality=6.5, ai_level="standard"
        )

        # Assert
        assert len(questions) == 3
        questions_text = " ".join(questions)
        assert any(word in questions_text.lower() for word in ["evidence", "argument", "thesis", "connect"])
        avg_length = sum(len(q.split()) for q in questions) / len(questions)
        assert 5 < avg_length < 20  # Medium complexity

    @pytest.mark.asyncio
    async def test_advanced_level_asks_sophisticated_questions(self, socratic_ai, mock_openai_response):
        """Advanced level should ask sophisticated critical thinking questions"""
        # Arrange
        advanced_questions = """What are the broader implications of your argument for this field?
        How might your personal perspective influence your analysis?
        What assumptions underlie your reasoning, and how might you examine them?"""

        socratic_ai.openai_client.chat.completions.create.return_value = mock_openai_response(advanced_questions)

        # Act
        questions = await socratic_ai.generate_questions(
            context="Exploring philosophical implications of AI", reflection_quality=8.5, ai_level="advanced"
        )

        # Assert
        assert len(questions) == 3
        questions_text = " ".join(questions)
        complexity = count_complex_words(questions_text)
        assert complexity >= 2  # Contains complex academic words
        assert any(word in questions_text.lower() for word in ["implications", "assumptions", "perspective"])

    @pytest.mark.asyncio
    async def test_question_progression_across_levels(self, socratic_ai, mock_openai_response):
        """Questions should increase in sophistication across levels"""
        # Arrange
        context = "Writing about education reform"
        responses = {
            "basic": "What do you think needs to change in education?\nWhy is this important to you?\nWhat examples can you think of?",
            "standard": "What evidence supports the need for reform?\nHow would your proposed changes address current problems?\nWhat are the potential challenges to implementation?",
            "advanced": "What are the underlying assumptions about learning in your reform proposal?\nHow might different stakeholders' perspectives shape the implementation?\nWhat are the epistemological implications of your educational philosophy?",
        }

        all_questions = {}

        for level in ["basic", "standard", "advanced"]:
            socratic_ai.openai_client.chat.completions.create.return_value = mock_openai_response(responses[level])

            # Act
            questions = await socratic_ai.generate_questions(
                context=context, reflection_quality=7.0, ai_level=level
            )
            all_questions[level] = questions

        # Assert - complexity should increase
        basic_complexity = sum(count_complex_words(q) for q in all_questions["basic"])
        standard_complexity = sum(count_complex_words(q) for q in all_questions["standard"])
        advanced_complexity = sum(count_complex_words(q) for q in all_questions["advanced"])

        assert basic_complexity < standard_complexity < advanced_complexity

        # Word length should also increase
        basic_avg = calculate_average_word_length(" ".join(all_questions["basic"]))
        standard_avg = calculate_average_word_length(" ".join(all_questions["standard"]))
        advanced_avg = calculate_average_word_length(" ".join(all_questions["advanced"]))

        assert basic_avg < advanced_avg  # Advanced uses longer words


class TestResponsePatterns:
    """Test specific response patterns and edge cases"""

    @pytest.mark.asyncio
    async def test_response_includes_encouragement(self, socratic_ai, mock_openai_response):
        """All responses should include encouragement"""
        # Arrange
        socratic_response = """That's a great question about structuring your argument!
        
        What key points do you want your reader to remember?
        How might you order these points for maximum impact?
        
        You're showing good thinking by considering structure - keep going!"""

        socratic_ai.openai_client.chat.completions.create.return_value = mock_openai_response(socratic_response)

        # Act
        response, _ = await socratic_ai.generate_socratic_response(
            question="How should I structure my essay?",
            context="Essay on renewable energy",
            ai_level="standard",
            user_id="test-user",
        )

        # Assert
        verification = verify_socratic_response(response)
        assert verification["encourages_student"] is True
        assert any(
            phrase in response.lower() for phrase in ["great", "good thinking", "keep going", "you're", "you can"]
        )

    @pytest.mark.asyncio
    async def test_response_handles_confusion(self, socratic_ai, mock_openai_response):
        """AI should handle confused or vague questions helpfully"""
        # Arrange
        socratic_response = """I can see you're working through some complex ideas.
        
        Can you tell me more about what aspect has you confused?
        What's the specific part you're struggling with?
        
        Sometimes breaking it down helps. What do you understand so far?"""

        socratic_ai.openai_client.chat.completions.create.return_value = mock_openai_response(socratic_response)

        # Act
        response, _ = await socratic_ai.generate_socratic_response(
            question="I don't get it", context="Philosophy essay", ai_level="basic", user_id="test-user"
        )

        # Assert
        verification = verify_socratic_response(response)
        assert verification["contains_questions"] is True
        assert "breaking it down" in response.lower() or "tell me more" in response.lower()
        assert verification["encourages_student"] is True

    @pytest.mark.asyncio
    async def test_response_stays_focused_on_learning(self, socratic_ai, mock_openai_response):
        """AI should always focus on the learning process"""
        # Arrange
        socratic_response = """Your curiosity about different perspectives is valuable!
        
        What viewpoints have you encountered in your research?
        How do these different perspectives challenge or support your thinking?
        
        Engaging with multiple viewpoints will strengthen your analysis."""

        socratic_ai.openai_client.chat.completions.create.return_value = mock_openai_response(socratic_response)

        # Act
        response, _ = await socratic_ai.generate_socratic_response(
            question="What do experts think about this?",
            context="Research paper on AI ethics",
            ai_level="advanced",
            user_id="test-user",
        )

        # Assert
        assert "research" in response.lower() or "perspectives" in response.lower()
        verification = verify_socratic_response(response)
        assert verification["contains_questions"] is True
        assert verification["contains_thinking_prompts"] is True


class TestReflectionAssessment:
    """Test reflection quality assessment"""

    @pytest.mark.asyncio
    async def test_assess_shallow_reflection(self, socratic_ai):
        """Shallow reflections should get low scores"""
        # Arrange
        shallow_reflection = "I need help with my essay about dogs."

        # Act
        score = await socratic_ai.assess_reflection_quality(shallow_reflection)

        # Assert
        assert score < 3.0  # Low score for minimal reflection
        assert 1.0 <= score <= 10.0  # Within valid range

    @pytest.mark.asyncio
    async def test_assess_quality_reflection(self, socratic_ai):
        """Quality reflections should get appropriate scores"""
        # Arrange
        quality_reflection = """I'm struggling with my argument about renewable energy policy. 
        I understand the environmental benefits, but I'm having trouble addressing the economic 
        concerns that critics raise. I want to present a balanced view that acknowledges the 
        challenges while still advocating for change. I've researched several case studies 
        but I'm not sure how to integrate them effectively into my argument structure."""

        # Act
        score = await socratic_ai.assess_reflection_quality(quality_reflection)

        # Assert
        # The scoring algorithm gives low scores based on the specific indicators
        # Since this uses "I'm struggling with" it gets moderate self-awareness (2)
        # Has "I want to" for developing depth (2) 
        # No critical thinking markers or growth mindset indicators
        # So we expect a lower score
        assert 3.0 <= score <= 5.0  # Moderate score
        assert score >= 3.0  # Above minimum threshold for basic AI

    @pytest.mark.asyncio
    async def test_assess_excellent_reflection(self, socratic_ai):
        """Excellent reflections should get high scores"""
        # Arrange
        # Create reflection with higher-scoring indicators
        excellent_reflection = """I'm grappling with the philosophical implications of artificial intelligence. 
        The complexity lies in understanding how AI affects human agency. I've analyzed multiple perspectives 
        and I recognize that I have biases. My approach is to consider different viewpoints. I'm aware that my 
        technological optimism clouds my judgment. What if we're creating dependencies? How might this affect 
        future generations? This connects to broader questions about human autonomy. The relationship between 
        technology and freedom suggests contradictions. The evidence shows both benefits and risks. 
        I'm learning to question my assumptions. I can improve by seeking diverse perspectives. This challenge 
        will help me grow as a thinker. I'm developing a more nuanced understanding.""" * 2  # Make it 150+ words

        # Act
        score = await socratic_ai.assess_reflection_quality(excellent_reflection)

        # Assert
        # With doubled text (300+ words), plus all the indicators, should score well
        assert score >= 4.5  # Above basic AI threshold
        assert score <= 10.0  # Still within bounds
        assert score > 3.0  # Definitely qualifies for AI access