from typing import List, Tuple, Optional
import openai
import anthropic
from app.core.config import settings
from app.prompts.socratic_prompts import (
    SOCRATIC_SYSTEM_PROMPT,
    BASIC_QUESTION_TEMPLATES,
    STANDARD_QUESTION_TEMPLATES,
    ADVANCED_QUESTION_TEMPLATES,
    REFLECTION_ASSESSMENT_PROMPT,
    ENCOURAGEMENT_TEMPLATES
)
from app.prompts.reflection_patterns import (
    calculate_reflection_dimensions,
    get_reflection_feedback
)
from app.prompts.stage_specific_prompts import get_stage_questions
from app.prompts.educational_philosophy import (
    validate_ai_response,
    COGNITIVE_LOAD_ADAPTATIONS,
    PROCESS_PROMPTS
)


class SocraticAI:
    """AI partner that guides through questions, not answers"""
    
    def __init__(self):
        self.openai_client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.anthropic_client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        
    async def assess_reflection_quality(self, reflection: str) -> float:
        """Assess the quality of a student's reflection (1-10 scale)"""
        
        # Use multi-dimensional analysis from reflection patterns
        dimensions = calculate_reflection_dimensions(reflection)
        
        # Weight the dimensions for overall score
        weighted_score = (
            dimensions["depth"] * 0.3 +
            dimensions["self_awareness"] * 0.2 +
            dimensions["critical_thinking"] * 0.3 +
            dimensions["growth_mindset"] * 0.2
        )
        
        # Add length bonus
        word_count = len(reflection.split())
        if word_count >= 150:
            weighted_score += 1.0
        elif word_count >= 100:
            weighted_score += 0.5
        
        # Normalize to 1-10 scale
        normalized_score = (weighted_score / 4) * 9 + 1
        
        return min(normalized_score, 10.0)
    
    async def generate_questions(
        self, 
        context: str, 
        reflection_quality: float,
        ai_level: str
    ) -> List[str]:
        """Generate Socratic questions based on context and AI level"""
        
        # Select appropriate question templates
        if ai_level == "basic":
            templates = BASIC_QUESTION_TEMPLATES
        elif ai_level == "standard":
            templates = STANDARD_QUESTION_TEMPLATES
        else:
            templates = ADVANCED_QUESTION_TEMPLATES
            
        prompt = f"""
        Based on this student reflection about their writing:
        
        "{context}"
        
        Generate 3 Socratic questions that will help them think deeper about their topic.
        Use these types of questions as inspiration: {templates}
        
        Remember:
        - Ask questions that prompt thinking, not questions that can be answered with facts
        - Focus on their reasoning, assumptions, and approach
        - Help them discover insights themselves
        - Never provide direct answers or write content for them
        """
        
        response = await self.openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": SOCRATIC_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=300
        )
        
        # Parse questions from response
        questions_text = response.choices[0].message.content
        questions = [q.strip() for q in questions_text.split('\n') if q.strip() and '?' in q]
        
        return questions[:3]  # Return top 3 questions
    
    async def generate_socratic_response(
        self,
        question: str,
        context: str,
        ai_level: str,
        user_id: str
    ) -> Tuple[str, str]:
        """Generate a Socratic response to student's question"""
        
        # Determine question type based on AI level
        if ai_level == "basic":
            question_type = "clarifying"
            instruction = "Ask simple clarifying questions to help them articulate their thoughts better."
        elif ai_level == "standard":
            question_type = "analytical"
            instruction = "Ask analytical questions that help them examine their reasoning and evidence."
        else:
            question_type = "critical"
            instruction = "Ask sophisticated questions that challenge assumptions and explore deeper implications."
            
        prompt = f"""
        The student is working on this writing:
        "{context}"
        
        They asked: "{question}"
        
        {instruction}
        
        Respond with 1-2 thoughtful questions that guide them to find their own answer.
        Do not provide direct answers or write any content for them.
        End with an encouraging note about their thinking process.
        """
        
        response = await self.openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": SOCRATIC_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=200
        )
        
        return response.choices[0].message.content, question_type
    
    async def get_follow_up_prompts(self, context: str, ai_level: str) -> List[str]:
        """Generate follow-up prompts to keep the conversation going"""
        
        if ai_level == "basic":
            return [
                "What's the main point you're trying to make?",
                "Can you explain that idea more?",
                "What made you think of this approach?"
            ]
        elif ai_level == "standard":
            return [
                "What evidence supports this claim?",
                "How does this connect to your thesis?",
                "What would someone who disagrees say?"
            ]
        else:
            return [
                "What are the implications of this argument?",
                "How does this challenge conventional thinking?",
                "What assumptions are you making here?"
            ]