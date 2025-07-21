from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models.ai_interaction import AIInteraction, Reflection
from app.models.document import Document
from app.models.user import User
from app.services.learning_analytics import LearningAnalyticsService
from app.services.socratic_ai import SocraticAI

router = APIRouter()
socratic_ai = SocraticAI()
analytics_service = LearningAnalyticsService()


class ReflectionSubmit(BaseModel):
    reflection: str
    document_id: str


class ReflectionResponse(BaseModel):
    access_granted: bool
    quality_score: float
    ai_level: Optional[str]
    feedback: str
    suggestions: Optional[list[str]]
    initial_questions: Optional[list[str]]


class AIQuestion(BaseModel):
    question: str
    context: str
    ai_level: str
    document_id: str


class AIResponse(BaseModel):
    response: str
    follow_up_prompts: list[str]
    question_type: str


@router.post("/reflect", response_model=ReflectionResponse)
async def submit_reflection(
    reflection_data: ReflectionSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Student must reflect before accessing AI assistance"""

    # Verify document ownership
    result = await db.execute(
        select(Document).where(
            Document.id == reflection_data.document_id,
            Document.user_id == current_user.id,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Analyze reflection quality
    try:
        quality_score = await socratic_ai.assess_reflection_quality(reflection_data.reflection)
    except Exception as e:
        print(f"Error assessing reflection quality: {str(e)}")
        # Default to a moderate score if assessment fails
        quality_score = 5.0
        
    word_count = len(reflection_data.reflection.split())

    # Determine AI access level based on quality
    if word_count < 50:
        return ReflectionResponse(
            access_granted=False,
            quality_score=quality_score,
            ai_level=None,
            feedback="Your reflection needs more depth. Aim for at least 50 words to show your thinking process.",
            suggestions=[
                "What is the main point you're trying to make?",
                "What challenges are you facing with this topic?",
                "What questions do you have about your approach?",
            ],
            initial_questions=None,
        )

    if quality_score < 3:
        return ReflectionResponse(
            access_granted=False,
            quality_score=quality_score,
            ai_level=None,
            feedback="Take a moment to think deeper about your approach. What are you really trying to accomplish?",
            suggestions=[
                "Explain your main argument or thesis",
                "Describe what evidence you plan to use",
                "Identify specific areas where you need help",
            ],
            initial_questions=None,
        )

    # Grant access with appropriate level
    if quality_score < 5:
        ai_level = "basic"
    elif quality_score < 8:
        ai_level = "standard"
    else:
        ai_level = "advanced"

    # Save reflection
    reflection = Reflection(
        user_id=current_user.id,
        document_id=reflection_data.document_id,
        content=reflection_data.reflection,
        word_count=word_count,
        quality_score=quality_score,
        ai_level_granted=ai_level,
    )
    db.add(reflection)
    await db.commit()
    await db.refresh(reflection)

    # Generate initial Socratic questions
    try:
        initial_questions = await socratic_ai.generate_questions(
            context=reflection_data.reflection,
            reflection_quality=quality_score,
            ai_level=ai_level,
        )
    except Exception as e:
        print(f"Error generating questions: {str(e)}")
        # Provide default questions based on AI level
        if ai_level == "basic":
            initial_questions = [
                "What is the main point you're trying to make?",
                "Can you tell me more about your topic?",
                "What challenges are you facing?"
            ]
        elif ai_level == "standard":
            initial_questions = [
                "What evidence supports your argument?",
                "How does this connect to your thesis?",
                "What are the key points you want to explore?"
            ]
        else:
            initial_questions = [
                "What are the implications of your argument?",
                "How might different perspectives challenge your view?",
                "What assumptions underlie your reasoning?"
            ]

    # Track analytics
    await analytics_service.track_reflection(
        user_id=current_user.id,
        document_id=reflection_data.document_id,
        quality_score=quality_score,
        ai_level=ai_level,
    )

    return ReflectionResponse(
        access_granted=True,
        quality_score=quality_score,
        ai_level=ai_level,
        feedback="Great reflection! I'm here to help you think through your ideas.",
        suggestions=None,
        initial_questions=initial_questions,
    )


@router.post("/ask", response_model=AIResponse)
async def ask_ai_partner(
    question_data: AIQuestion,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI responds with Socratic questions, not answers"""

    # Verify document ownership
    result = await db.execute(
        select(Document).where(
            Document.id == question_data.document_id,
            Document.user_id == current_user.id,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Generate Socratic response
    start_time = datetime.utcnow()
    try:
        response, question_type = await socratic_ai.generate_socratic_response(
            question=question_data.question,
            context=question_data.context,
            ai_level=question_data.ai_level,
            user_id=current_user.id,
        )
    except Exception as e:
        # Log the error (in production, you'd use proper logging)
        print(f"AI service error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="AI service is temporarily unavailable. Please try again later."
        )
    
    response_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

    # Get follow-up prompts
    try:
        follow_up_prompts = await socratic_ai.get_follow_up_prompts(
            context=question_data.context, ai_level=question_data.ai_level
        )
    except Exception:
        # If follow-up prompts fail, provide defaults based on AI level
        follow_up_prompts = [
            "Can you tell me more about your thoughts?",
            "What specific aspect would you like to explore?",
            "How does this relate to your main argument?"
        ]

    # Log interaction
    ai_interaction = AIInteraction(
        user_id=current_user.id,
        document_id=question_data.document_id,
        user_message=question_data.question,
        ai_response=response,
        ai_level=question_data.ai_level,
        response_time_ms=response_time_ms,
        question_type=question_type,
    )
    db.add(ai_interaction)
    await db.commit()

    # Track analytics
    await analytics_service.track_ai_interaction(
        user_id=current_user.id,
        document_id=question_data.document_id,
        interaction_type=question_type,
        response_time_ms=response_time_ms,
    )

    return AIResponse(
        response=response,
        follow_up_prompts=follow_up_prompts,
        question_type=question_type,
    )


@router.get("/conversations/{document_id}")
async def get_conversation_history(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get AI conversation history for a document"""

    # Verify document ownership
    result = await db.execute(select(Document).where(Document.id == document_id, Document.user_id == current_user.id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Get interactions
    result = await db.execute(
        select(AIInteraction).where(AIInteraction.document_id == document_id).order_by(AIInteraction.created_at)
    )
    interactions = result.scalars().all()

    return {
        "document_id": document_id,
        "conversations": [
            {
                "id": interaction.id,
                "user_message": interaction.user_message,
                "ai_response": interaction.ai_response,
                "ai_level": interaction.ai_level,
                "question_type": interaction.question_type,
                "created_at": interaction.created_at,
            }
            for interaction in interactions
        ],
    }
