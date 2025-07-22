from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.core.database import get_db
from app.core.monitoring import logger, track_user_action
from app.core.security_middleware import rate_limit_ai
from app.models.ai_interaction import AIInteraction, Reflection
from app.models.document import Document, DocumentVersion
from app.models.user import User
from app.services.learning_analytics import LearningAnalyticsService
from app.services.socratic_ai import SocraticAI

router = APIRouter()
socratic_ai = SocraticAI()
analytics_service = LearningAnalyticsService()


async def track_style_analysis_event(
    db: AsyncSession,
    user_id: str,
    document_id: Optional[str],
    event_type: str,
    metadata: Optional[dict] = None,
) -> None:
    """Helper function to track style analysis events via AI interactions"""
    # Log with structured logger
    logger.info(
        "Style analysis event",
        event_type=event_type,
        user_id=user_id,
        document_id=document_id,
        metadata=metadata,
    )

    # Track user action for Sentry breadcrumbs
    track_user_action(
        f"style_analysis_{event_type}",
        user_id,
        {"document_id": document_id, **(metadata or {})},
    )

    # If document_id is provided, we could optionally create an AI interaction record
    if document_id and event_type == "style_analysis":
        interaction = AIInteraction(
            user_id=user_id,
            document_id=document_id,
            user_message=f"Style analysis: {metadata.get('tone', 'unknown')} tone",
            ai_response="Style analyzed",
            ai_level="standard",
            question_type="style_analysis",
        )
        db.add(interaction)
        await db.commit()


class ReflectionSubmit(BaseModel):
    reflection: str = Field(..., min_length=1, max_length=10000)
    document_id: str = Field(..., min_length=1)

    @validator("reflection")
    def validate_reflection(cls, v):
        # Strip whitespace
        v = v.strip()
        if not v:
            raise ValueError("Reflection cannot be empty")
        # Basic XSS prevention - could be enhanced
        if any(
            tag in v.lower()
            for tag in ["<script", "<iframe", "javascript:", "onerror="]
        ):
            raise ValueError("Invalid content detected")
        return v


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


class StyleAnalysisRequest(BaseModel):
    text: str
    document_id: Optional[str] = None


class StyleAnalysisResponse(BaseModel):
    patterns: list[str]
    tone: str
    sentence_complexity: str
    vocabulary_level: str


class StyleFeedbackRequest(BaseModel):
    text: str
    document_id: str
    ai_level: Optional[str] = None
    genre: Optional[str] = None


class StyleGoalComparisonRequest(BaseModel):
    text: str
    style_goal: str
    document_id: Optional[str] = None


@router.post(
    "/reflect", response_model=ReflectionResponse, dependencies=[Depends(rate_limit_ai)]
)
async def submit_reflection(
    request: Request,
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
        quality_score = await socratic_ai.assess_reflection_quality(
            reflection_data.reflection
        )
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

    # Get reflection history for adaptive AI level
    reflection_history_result = await db.execute(
        select(Reflection)
        .where(
            Reflection.user_id == current_user.id,
            Reflection.document_id == reflection_data.document_id,
        )
        .order_by(Reflection.created_at.desc())
        .limit(5)
    )
    reflection_history = reflection_history_result.scalars().all()

    # Get interaction history
    interaction_history_result = await db.execute(
        select(AIInteraction)
        .where(
            AIInteraction.user_id == current_user.id,
            AIInteraction.document_id == reflection_data.document_id,
        )
        .order_by(AIInteraction.created_at.desc())
        .limit(10)
    )
    interaction_history = interaction_history_result.scalars().all()

    # Calculate adaptive AI level
    reflection_history_data = [
        {"quality_score": r.quality_score, "created_at": r.created_at}
        for r in reflection_history
    ]
    interaction_history_data = [
        {"user_message": i.user_message, "created_at": i.created_at}
        for i in interaction_history
    ]

    try:
        ai_level = await socratic_ai.calculate_adaptive_ai_level(
            current_quality=quality_score,
            reflection_history=reflection_history_data,
            interaction_history=interaction_history_data,
        )
    except Exception:
        # Fallback to basic calculation if adaptive fails
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

    # Get document version history for context
    from app.models.document import DocumentVersion

    document_versions_result = await db.execute(
        select(DocumentVersion)
        .where(DocumentVersion.document_id == reflection_data.document_id)
        .order_by(DocumentVersion.created_at.desc())
        .limit(5)
    )
    document_versions = document_versions_result.scalars().all()

    document_history = [
        {
            "content": v.content,
            "version_number": v.version_number,
            "created_at": v.created_at,
        }
        for v in document_versions
    ]

    # Generate initial Socratic questions with document history
    try:
        initial_questions = await socratic_ai.generate_questions_with_history(
            context=reflection_data.reflection,
            reflection_quality=quality_score,
            ai_level=ai_level,
            document_history=document_history,
        )
    except Exception as e:
        print(f"Error generating questions with history: {str(e)}")
        # Fallback to regular question generation
        try:
            initial_questions = await socratic_ai.generate_questions(
                context=reflection_data.reflection,
                reflection_quality=quality_score,
                ai_level=ai_level,
            )
        except Exception:
            # Provide default questions based on AI level
            if ai_level == "basic":
                initial_questions = [
                    "What is the main point you're trying to make?",
                    "Can you tell me more about your topic?",
                    "What challenges are you facing?",
                ]
            elif ai_level == "standard":
                initial_questions = [
                    "What evidence supports your argument?",
                    "How does this connect to your thesis?",
                    "What are the key points you want to explore?",
                ]
            else:
                initial_questions = [
                    "What are the implications of your argument?",
                    "How might different perspectives challenge your view?",
                    "What assumptions underlie your reasoning?",
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


@router.post("/ask", response_model=AIResponse, dependencies=[Depends(rate_limit_ai)])
async def ask_ai_partner(
    request: Request,
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

    # Get conversation history (last 5 interactions)
    conversation_history_result = await db.execute(
        select(AIInteraction)
        .where(
            AIInteraction.document_id == question_data.document_id,
            AIInteraction.user_id == current_user.id,
        )
        .order_by(AIInteraction.created_at.desc())
        .limit(5)
    )
    conversation_history = conversation_history_result.scalars().all()

    # Reverse to get chronological order
    conversation_history = list(reversed(conversation_history))

    conversation_data = [
        {
            "user_message": c.user_message,
            "ai_response": c.ai_response,
            "created_at": c.created_at,
        }
        for c in conversation_history
    ]

    # Get document versions for context
    from app.models.document import DocumentVersion

    document_versions_result = await db.execute(
        select(DocumentVersion)
        .where(DocumentVersion.document_id == question_data.document_id)
        .order_by(DocumentVersion.created_at.desc())
        .limit(3)
    )
    document_versions = document_versions_result.scalars().all()

    document_versions_data = [
        {
            "content": v.content,
            "version_number": v.version_number,
            "created_at": v.created_at,
        }
        for v in document_versions
    ]

    # Generate Socratic response with context
    start_time = datetime.utcnow()
    try:
        (
            response,
            question_type,
        ) = await socratic_ai.generate_socratic_response_with_context(
            question=question_data.question,
            context=question_data.context,
            ai_level=question_data.ai_level,
            user_id=current_user.id,
            conversation_history=conversation_data,
            document_versions=document_versions_data,
        )
    except Exception:
        # Fallback to regular response generation
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
                detail="AI service is temporarily unavailable. Please try again later.",
            ) from e

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
            "How does this relate to your main argument?",
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
    result = await db.execute(
        select(Document).where(
            Document.id == document_id, Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Get interactions
    result = await db.execute(
        select(AIInteraction)
        .where(AIInteraction.document_id == document_id)
        .order_by(AIInteraction.created_at)
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


@router.post("/style/analyze")
async def analyze_writing_style(
    style_data: StyleAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StyleAnalysisResponse:
    """Analyze writing style patterns without providing corrections"""

    # Verify document ownership if document_id provided
    if style_data.document_id:
        result = await db.execute(
            select(Document).where(
                Document.id == style_data.document_id,
                Document.user_id == current_user.id,
            )
        )
        document = result.scalar_one_or_none()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

    # Analyze style
    try:
        style_analysis = await socratic_ai.analyze_writing_style(style_data.text)

        # Track analytics
        await track_style_analysis_event(
            db=db,
            user_id=current_user.id,
            document_id=style_data.document_id,
            event_type="style_analysis",
            metadata={
                "tone": style_analysis["tone"],
                "complexity": style_analysis["sentence_complexity"],
                "vocabulary": style_analysis["vocabulary_level"],
            },
        )

        return StyleAnalysisResponse(**style_analysis)
    except Exception as e:
        print(f"Error analyzing style: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Error analyzing writing style"
        ) from e


@router.post("/style/feedback")
async def get_style_feedback(
    feedback_request: StyleFeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get Socratic feedback on writing style"""

    # Verify document ownership
    result = await db.execute(
        select(Document).where(
            Document.id == feedback_request.document_id,
            Document.user_id == current_user.id,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Get AI level from latest reflection or use default
    ai_level = feedback_request.ai_level or "standard"

    try:
        feedback = await socratic_ai.provide_style_feedback(
            text=feedback_request.text,
            ai_level=ai_level,
            genre=feedback_request.genre,
            detect_fix_request=True,
        )

        # Track interaction
        ai_interaction = AIInteraction(
            user_id=current_user.id,
            document_id=feedback_request.document_id,
            user_message=f"Style feedback request: {feedback_request.text[:100]}...",
            ai_response=feedback,
            ai_level=ai_level,
            question_type="style_feedback",
        )
        db.add(ai_interaction)
        await db.commit()

        return {"feedback": feedback, "ai_level": ai_level}
    except Exception as e:
        print(f"Error generating style feedback: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Error generating style feedback"
        ) from e


@router.get("/style/evolution/{document_id}")
async def get_style_evolution(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Analyze style evolution across document versions"""

    # Verify document ownership
    result = await db.execute(
        select(Document).where(
            Document.id == document_id, Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Get document versions
    result = await db.execute(
        select(DocumentVersion)
        .where(DocumentVersion.document_id == document_id)
        .order_by(DocumentVersion.version_number)
    )
    versions = result.scalars().all()

    if len(versions) < 2:
        return {
            "document_id": document_id,
            "overall_trend": "insufficient_data",
            "message": "Need at least 2 versions to analyze evolution",
        }

    # Prepare samples for analysis
    writing_samples = [
        {
            "version": v.version_number,
            "text": v.content,
            "timestamp": v.created_at.isoformat(),
        }
        for v in versions
    ]

    try:
        evolution = await socratic_ai.analyze_style_evolution(writing_samples)

        # Calculate style metrics for latest version
        latest_metrics = await socratic_ai.calculate_style_metrics(versions[-1].content)

        return {
            "document_id": document_id,
            "versions_analyzed": len(versions),
            "evolution": evolution,
            "current_metrics": latest_metrics,
        }
    except Exception as e:
        print(f"Error analyzing style evolution: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Error analyzing style evolution"
        ) from e


@router.post("/style/compare-goal")
async def compare_style_with_goal(
    comparison_request: StyleGoalComparisonRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Compare current writing style with a target style goal"""

    # Verify document ownership if document_id provided
    if comparison_request.document_id:
        result = await db.execute(
            select(Document).where(
                Document.id == comparison_request.document_id,
                Document.user_id == current_user.id,
            )
        )
        document = result.scalar_one_or_none()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

    try:
        comparison = await socratic_ai.compare_style_with_goal(
            text=comparison_request.text, style_goal=comparison_request.style_goal
        )

        # Track analytics
        await track_style_analysis_event(
            db=db,
            user_id=current_user.id,
            document_id=comparison_request.document_id,
            event_type="style_goal_comparison",
            metadata={
                "style_goal": comparison_request.style_goal,
                "alignment_score": comparison["alignment_score"],
            },
        )

        return comparison
    except Exception as e:
        print(f"Error comparing style with goal: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Error comparing style with goal"
        ) from e
