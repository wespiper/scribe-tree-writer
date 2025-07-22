import re
from typing import Any, Optional

import anthropic
import openai

from app.core.config import settings
from app.core.monitoring import logger, measure_performance
from app.prompts.reflection_patterns import (
    calculate_reflection_dimensions,
)
from app.prompts.socratic_prompts import (
    ADVANCED_QUESTION_TEMPLATES,
    BASIC_QUESTION_TEMPLATES,
    SOCRATIC_SYSTEM_PROMPT,
    STANDARD_QUESTION_TEMPLATES,
)


class SocraticAI:
    """AI partner that guides through questions, not answers"""

    def __init__(self) -> None:
        self.openai_client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.anthropic_client = anthropic.AsyncAnthropic(
            api_key=settings.ANTHROPIC_API_KEY
        )

    @measure_performance("assess_reflection_quality", op="ai")
    async def assess_reflection_quality(self, reflection: str) -> float:
        """Assess the quality of a student's reflection (1-10 scale)"""
        logger.info(
            "Assessing reflection quality",
            reflection_length=len(reflection),
            word_count=len(reflection.split()),
        )

        # Use multi-dimensional analysis from reflection patterns
        dimensions = calculate_reflection_dimensions(reflection)

        # Weight the dimensions for overall score
        weighted_score = (
            dimensions["depth"] * 0.3
            + dimensions["self_awareness"] * 0.2
            + dimensions["critical_thinking"] * 0.3
            + dimensions["growth_mindset"] * 0.2
        )

        # Add length bonus
        word_count = len(reflection.split())
        if word_count >= 150:
            weighted_score += 1.0
        elif word_count >= 50:
            weighted_score += 0.5

        # Normalize to 1-10 scale
        normalized_score = (weighted_score / 4) * 9 + 1
        final_score = float(min(normalized_score, 10.0))

        logger.debug(
            "Reflection quality assessed",
            score=final_score,
            dimensions=dimensions,
            word_count=word_count,
        )

        return final_score

    async def generate_questions(
        self, context: str, reflection_quality: float, ai_level: str
    ) -> list[str]:
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
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=300,
        )

        # Parse questions from response
        questions_text = response.choices[0].message.content or ""
        questions = [
            q.strip() for q in questions_text.split("\n") if q.strip() and "?" in q
        ]

        return questions[:3]  # Return top 3 questions

    async def generate_socratic_response(
        self, question: str, context: str, ai_level: str, user_id: str
    ) -> tuple[str, str]:
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
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=200,
        )

        return response.choices[0].message.content or "" or "", question_type

    async def get_follow_up_prompts(self, context: str, ai_level: str) -> list[str]:
        """Generate follow-up prompts to keep the conversation going"""

        if ai_level == "basic":
            return [
                "What's the main point you're trying to make?",
                "Can you explain that idea more?",
                "What made you think of this approach?",
            ]
        elif ai_level == "standard":
            return [
                "What evidence supports this claim?",
                "How does this connect to your thesis?",
                "What would someone who disagrees say?",
            ]
        else:
            return [
                "What are the implications of this argument?",
                "How does this challenge conventional thinking?",
                "What assumptions are you making here?",
            ]

    async def generate_socratic_response_with_context(
        self,
        question: str,
        context: str,
        ai_level: str,
        user_id: str,
        conversation_history: Optional[list[dict[str, Any]]] = None,
        document_versions: Optional[list[dict[str, Any]]] = None,
        document_summary: Optional[str] = None,
    ) -> tuple[str, str]:
        """Generate a Socratic response considering conversation history and document evolution"""

        # Build enhanced context
        enhanced_prompt = f"""The student is working on this writing:
        "{context}"

        They asked: "{question}"
        """

        # Add conversation history if available
        if conversation_history:
            history_text = "\n\nPrevious conversation:\n"
            for conv in conversation_history[-5:]:  # Last 5 conversations
                history_text += f"Student: {conv['user_message']}\n"
                history_text += f"You: {conv['ai_response']}\n\n"
            enhanced_prompt += history_text

        # Add document evolution context if available
        if document_versions and len(document_versions) > 1:
            enhanced_prompt += "\n\nTheir writing has evolved through these versions:\n"
            for i, version in enumerate(document_versions[-3:]):  # Last 3 versions
                enhanced_prompt += (
                    f"Version {i+1}: {version.get('content', '')[:200]}...\n"
                )
        elif document_summary:
            enhanced_prompt += f"\n\nDocument summary: {document_summary}\n"

        # Determine question type and instruction based on AI level
        if ai_level == "basic":
            question_type = "clarifying"
            instruction = "Ask simple clarifying questions to help them articulate their thoughts better."
        elif ai_level == "standard":
            question_type = "analytical"
            instruction = "Ask analytical questions that help them examine their reasoning and evidence."
        else:
            question_type = "critical"
            instruction = "Ask sophisticated questions that challenge assumptions and explore deeper implications."

        enhanced_prompt += f"\n\n{instruction}\n"
        enhanced_prompt += """
        Respond with 1-2 thoughtful questions that guide them to find their own answer.
        Do not provide direct answers or write any content for them.
        Consider their previous conversations and how their thinking has evolved.
        End with an encouraging note about their thinking process.
        """

        response = await self.openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": SOCRATIC_SYSTEM_PROMPT},
                {"role": "user", "content": enhanced_prompt},
            ],
            temperature=0.7,
            max_tokens=300,
        )

        return response.choices[0].message.content or "" or "", question_type

    async def generate_questions_with_history(
        self,
        context: str,
        reflection_quality: float,
        ai_level: str,
        document_history: Optional[list[dict[str, Any]]] = None,
    ) -> list[str]:
        """Generate Socratic questions considering document history"""

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
        """

        # Add document history context if available
        if document_history:
            prompt += "\n\nTheir document has evolved through these stages:\n"
            for i, version in enumerate(document_history[-3:]):  # Last 3 versions
                prompt += f"Stage {i+1}: {version.get('content', '')[:150]}...\n"

        prompt += f"""
        Generate 3 Socratic questions that will help them think deeper about their topic.
        Use these types of questions as inspiration: {templates}

        Consider how their ideas have evolved and help them see connections between their earlier and current thinking.

        Remember:
        - Ask questions that prompt thinking, not questions that can be answered with facts
        - Focus on their reasoning, assumptions, and approach
        - Help them discover insights themselves
        - Never provide direct answers or write content for them
        - Reference their document's evolution when relevant
        """

        response = await self.openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": SOCRATIC_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=400,
        )

        # Parse questions from response
        questions_text = response.choices[0].message.content or ""
        questions = [
            q.strip() for q in questions_text.split("\n") if q.strip() and "?" in q
        ]

        return questions[:3]  # Return top 3 questions

    async def calculate_adaptive_ai_level(
        self,
        current_quality: float,
        reflection_history: Optional[list[dict[str, Any]]] = None,
        interaction_history: Optional[list[dict[str, Any]]] = None,
    ) -> str:
        """Calculate adaptive AI level based on student progress"""

        # Base level from current quality
        if current_quality < 5:
            base_level = "basic"
        elif current_quality < 8:
            base_level = "standard"
        else:
            base_level = "advanced"

        # Adjust based on reflection history trends
        if reflection_history and len(reflection_history) >= 3:
            recent_scores = [r["quality_score"] for r in reflection_history[-3:]]
            avg_recent = sum(recent_scores) / len(recent_scores)

            # Check for consistent improvement
            if all(
                recent_scores[i] <= recent_scores[i + 1]
                for i in range(len(recent_scores) - 1)
            ):
                # Consistent improvement - consider upgrading
                if base_level == "basic" and avg_recent >= 4.5:
                    return "standard"
                elif base_level == "standard" and avg_recent >= 7.5:
                    return "advanced"

            # Check for decline
            elif all(
                recent_scores[i] >= recent_scores[i + 1]
                for i in range(len(recent_scores) - 1)
            ):
                # Consistent decline - consider downgrading
                if base_level == "advanced" and avg_recent < 7:
                    return "standard"
                elif base_level == "standard" and avg_recent < 4:
                    return "basic"

        # Consider interaction quality if available
        if interaction_history and len(interaction_history) >= 2:
            # Check engagement quality (length and depth of questions)
            recent_questions = [i["user_message"] for i in interaction_history[-5:]]
            avg_question_length = sum(len(q.split()) for q in recent_questions) / len(
                recent_questions
            )

            # Engaged students ask longer, more detailed questions
            if avg_question_length > 15 and base_level == "basic":
                return "standard"
            elif avg_question_length > 25 and base_level == "standard":
                return "advanced"

        return base_level

    async def analyze_writing_style(self, text: str) -> dict[str, Any]:
        """Analyze writing style patterns without providing corrections"""

        prompt = f"""Analyze the writing style of this text:

        "{text}"

        Identify:
        1. Tone (informal, formal_academic, conversational, etc.)
        2. Sentence complexity (simple, compound, complex)
        3. Vocabulary level (basic, intermediate, sophisticated)
        4. Key patterns in the writing

        Do NOT provide corrections or rewritten versions.
        Focus only on describing what you observe."""

        response = await self.openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": SOCRATIC_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=300,
        )

        # Parse the analysis
        analysis_text = response.choices[0].message.content or ""

        # Extract key patterns
        patterns = []
        for line in analysis_text.split("\n"):
            if (
                line.strip()
                and not line.startswith("Tone:")
                and not line.startswith("Sentence")
            ):
                patterns.append(line.strip().lstrip("- "))

        # Determine tone
        tone = "neutral"
        if "formal" in analysis_text.lower() or "academic" in analysis_text.lower():
            tone = "formal_academic"
        elif "informal" in analysis_text.lower() or "casual" in analysis_text.lower():
            tone = "informal"
        elif "conversational" in analysis_text.lower():
            tone = "conversational"

        # Determine complexity
        complexity = "medium"
        if "simple" in analysis_text.lower() and "complex" not in analysis_text.lower():
            complexity = "simple"
        elif (
            "complex" in analysis_text.lower() and "simple" not in analysis_text.lower()
        ):
            complexity = "complex"

        # Determine vocabulary
        vocab = "intermediate"
        if "basic" in analysis_text.lower() or "simple vocab" in analysis_text.lower():
            vocab = "basic"
        elif (
            "sophisticated" in analysis_text.lower()
            or "advanced" in analysis_text.lower()
        ):
            vocab = "sophisticated"

        return {
            "patterns": patterns[:5],  # Top 5 patterns
            "tone": tone,
            "sentence_complexity": complexity,
            "vocabulary_level": vocab,
            "raw_analysis": analysis_text,
        }

    async def generate_style_improvement_questions(
        self, text: str, style_patterns: dict[str, Any]
    ) -> list[str]:
        """Generate Socratic questions to help improve writing style"""

        prompt = f"""Based on this text:
        "{text}"

        And these identified style patterns:
        - Tone: {style_patterns.get('tone', 'unknown')}
        - Clarity: {style_patterns.get('clarity', 'unknown')}

        Generate 3 Socratic questions that will help the writer improve their style.

        Remember:
        - Ask questions that make them think about their choices
        - Never suggest specific rewrites or corrections
        - Focus on helping them discover improvements themselves
        - Do not use phrases like "rewrite" or "change to"
        """

        response = await self.openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": SOCRATIC_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=300,
        )

        # Parse questions
        questions_text = response.choices[0].message.content or ""
        questions = [
            q.strip()
            for q in questions_text.split("\n")
            if q.strip()
            and "?" in q
            and not any(
                word in q.lower() for word in ["rewrite", "change to", "should be"]
            )
        ]

        return questions[:3]

    async def provide_style_feedback(
        self,
        text: str,
        ai_level: str,
        genre: Optional[str] = None,
        detect_fix_request: bool = False,
    ) -> str:
        """Provide Socratic feedback on writing style"""

        # Check if this is a request to fix/correct
        if detect_fix_request and any(
            phrase in text.lower()
            for phrase in [
                "fix this",
                "correct this",
                "rewrite this",
                "improve this for me",
            ]
        ):
            return """Instead of fixing it for you, consider:
1. Who should come first when listing yourself with others?
2. What's the difference between subject and object pronouns?
3. How do you know which pronoun form to use?"""

        # Build prompt based on AI level
        if ai_level == "basic":
            instruction = "Ask simple questions about their word choices and clarity."
        elif ai_level == "standard":
            instruction = "Ask questions about sentence structure and flow."
        else:
            instruction = (
                "Ask sophisticated questions about rhythm, tone, and rhetorical effect."
            )

        prompt = f"""Provide feedback on this writing style:
        "{text}"

        {instruction}

        """

        if genre:
            prompt += f"This is {genre} writing, so consider genre-appropriate style elements.\n"

        prompt += """
        Respond with 1-2 questions that help them think about their style choices.
        Never provide corrections or rewritten versions.
        End with brief encouragement about their writing development.
        """

        response = await self.openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": SOCRATIC_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=200,
        )

        return response.choices[0].message.content or ""

    async def analyze_style_evolution(
        self, writing_samples: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """Analyze how writing style has evolved over time"""

        if not writing_samples:
            return {
                "improvements": [],
                "areas_of_growth": [],
                "current_strengths": [],
                "overall_trend": "no_data",
            }

        # Build evolution context
        evolution_text = "Writing samples over time:\n\n"
        for sample in writing_samples:
            evolution_text += f"Version {sample['version']} ({sample['timestamp']}): {sample['text'][:200]}...\n\n"

        prompt = f"""{evolution_text}

        Analyze how this writer's style has evolved.
        Identify:
        1. Improvements in style
        2. Areas of growth
        3. Current strengths
        4. Overall trend

        Focus on style evolution, not content.
        Do not provide corrections or suggestions for rewriting.
        """

        response = await self.openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": SOCRATIC_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=400,
        )

        analysis = response.choices[0].message.content or ""

        # Determine overall trend
        trend = "stable"
        if "improving" in analysis.lower() or "growth" in analysis.lower():
            trend = "improving"
        elif "declining" in analysis.lower() or "regressing" in analysis.lower():
            trend = "declining"

        # Extract insights
        improvements = []
        areas_of_growth = []
        strengths = []

        lines = analysis.split("\n")
        current_section = None

        for line in lines:
            line = line.strip()
            if "improvement" in line.lower():
                current_section = "improvements"
            elif "growth" in line.lower():
                current_section = "growth"
            elif "strength" in line.lower():
                current_section = "strengths"
            elif line and line.startswith("-"):
                item = line.lstrip("- ")
                if current_section == "improvements":
                    improvements.append(item)
                elif current_section == "growth":
                    areas_of_growth.append(item)
                elif current_section == "strengths":
                    strengths.append(item)

        return {
            "improvements": improvements[:3],
            "areas_of_growth": areas_of_growth[:3],
            "current_strengths": strengths[:3],
            "overall_trend": trend,
            "raw_analysis": analysis,
        }

    async def calculate_style_metrics(self, text: str) -> dict[str, float]:
        """Calculate quantifiable style metrics"""

        # Basic text processing
        sentences = re.split(r"[.!?]+", text)
        sentences = [s.strip() for s in sentences if s.strip()]
        words = text.split()

        # Calculate metrics
        avg_sentence_length = len(words) / max(len(sentences), 1)

        # Vocabulary diversity (unique words / total words)
        unique_words = {word.lower() for word in words}
        vocabulary_diversity = len(unique_words) / max(len(words), 1)

        # Simple readability approximation (Flesch Reading Ease simplified)
        # This is a simplified version - real implementation would be more complex
        total_syllables = sum(self._count_syllables(word) for word in words)
        avg_syllables_per_word = total_syllables / max(len(words), 1)

        # Simplified readability score (higher = easier to read)
        readability_score = (
            206.835 - 1.015 * avg_sentence_length - 84.6 * avg_syllables_per_word
        )
        readability_score = max(0, min(100, readability_score))  # Clamp to 0-100

        return {
            "avg_sentence_length": round(avg_sentence_length, 2),
            "vocabulary_diversity": round(vocabulary_diversity, 3),
            "readability_score": round(readability_score, 1),
            "total_words": len(words),
            "total_sentences": len(sentences),
            "unique_words": len(unique_words),
        }

    def _count_syllables(self, word: str) -> int:
        """Simple syllable counter (approximate)"""
        word = word.lower()
        vowels = "aeiou"
        syllable_count = 0
        previous_was_vowel = False

        for char in word:
            is_vowel = char in vowels
            if is_vowel and not previous_was_vowel:
                syllable_count += 1
            previous_was_vowel = is_vowel

        # Adjust for silent e
        if word.endswith("e"):
            syllable_count -= 1

        # Ensure at least 1 syllable
        return max(1, syllable_count)

    async def compare_style_with_goal(
        self, text: str, style_goal: str
    ) -> dict[str, Any]:
        """Compare current writing style with a target style"""

        goal_descriptions = {
            "academic_formal": "formal academic writing with precise language and citations",
            "conversational": "conversational tone that engages readers personally",
            "persuasive": "persuasive writing that builds compelling arguments",
            "narrative": "narrative style with vivid descriptions and flow",
            "technical": "technical writing that is clear and precise",
        }

        goal_desc = goal_descriptions.get(style_goal, style_goal)

        prompt = f"""Compare this text:
        "{text}"

        With the goal of achieving {goal_desc} style.

        Generate 3 Socratic questions that help the writer move toward this style goal.
        Do not provide rewritten versions or direct corrections.
        Focus on questions that make them think about style choices.
        """

        response = await self.openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": SOCRATIC_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=300,
        )

        # Parse questions
        questions_text = response.choices[0].message.content or ""
        questions = [
            q.strip() for q in questions_text.split("\n") if q.strip() and "?" in q
        ]

        # Calculate rough alignment score (0-10)
        # This is simplified - real implementation would analyze specific features
        current_style = await self.analyze_writing_style(text)
        alignment_score = 5.0  # Default middle score

        if (
            style_goal == "academic_formal"
            and current_style["tone"] == "formal_academic"
        ):
            alignment_score = 8.0
        elif (
            style_goal == "conversational" and current_style["tone"] == "conversational"
        ):
            alignment_score = 8.0
        elif current_style["tone"] == "informal" and "formal" in style_goal:
            alignment_score = 3.0
        elif (
            current_style["tone"] == "formal_academic"
            and "conversational" in style_goal
        ):
            alignment_score = 3.0

        return {
            "alignment_score": alignment_score,
            "improvement_questions": questions[:3],
            "current_style": current_style["tone"],
            "target_style": style_goal,
        }
