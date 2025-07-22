"""Analytics API endpoints for learning insights"""

from datetime import date, datetime
from typing import Any, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import Response as FastAPIResponse
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.auth import get_current_user
from app.core.cache import cache_response
from app.core.database import get_db
from app.models.ai_interaction import AIInteraction, Reflection
from app.models.document import Document
from app.models.user import User
from app.services.export_service import ExportService

router = APIRouter()


def validate_date_range(start_date: Optional[date], end_date: Optional[date]) -> None:
    """Validate date range parameters"""
    if start_date and end_date and end_date < start_date:
        raise HTTPException(status_code=422, detail="End date must be after start date")


@router.get("/reflection-quality")
async def get_reflection_quality_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    start_date: Optional[date] = Query(None, description="Start date for filtering"),
    end_date: Optional[date] = Query(None, description="End date for filtering"),
    limit: Optional[int] = Query(None, description="Limit results", ge=1, le=100),
    offset: Optional[int] = Query(0, description="Offset for pagination", ge=0),
) -> dict[str, Any]:
    """Get reflection quality analytics for the current user"""
    validate_date_range(start_date, end_date)

    # Build query
    query = select(Reflection).join(Document).where(Document.user_id == current_user.id)

    # Apply date filters if provided
    if start_date:
        query = query.where(
            Reflection.created_at >= datetime.combine(start_date, datetime.min.time())
        )
    if end_date:
        query = query.where(
            Reflection.created_at <= datetime.combine(end_date, datetime.max.time())
        )

    # Get total count and average using database aggregation
    count_query = (
        select(func.count(Reflection.id), func.avg(Reflection.quality_score))
        .select_from(Reflection)
        .join(Document)
        .where(Document.user_id == current_user.id)
    )

    # Apply same date filters to count query
    if start_date:
        count_query = count_query.where(
            Reflection.created_at >= datetime.combine(start_date, datetime.min.time())
        )
    if end_date:
        count_query = count_query.where(
            Reflection.created_at <= datetime.combine(end_date, datetime.max.time())
        )

    count_result = await db.execute(count_query)
    total_count, avg_quality = count_result.one()
    avg_quality = float(avg_quality) if avg_quality else 0.0

    # Order by date and apply pagination
    query = query.order_by(Reflection.created_at.desc())
    if limit:
        query = query.limit(limit).offset(offset)

    # Execute query for paginated results
    result = await db.execute(query)
    reflections = result.scalars().all()

    # Build response data
    data = []
    for reflection in reflections:
        data.append(
            {
                "id": str(reflection.id),
                "date": reflection.created_at.isoformat(),
                "quality_score": reflection.quality_score,
                "word_count": reflection.word_count,  # Use stored word_count
                "ai_level": reflection.ai_level_granted,
            }
        )

    response = {
        "data": data,
        "average_quality": round(avg_quality, 2),
        "total_reflections": total_count,
    }

    # Add pagination info if limit was specified
    if limit:
        response["has_more"] = (offset + limit) < total_count
        response["limit"] = limit
        response["offset"] = offset

    return response


@router.get("/writing-progress")
async def get_writing_progress_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    start_date: Optional[date] = Query(None, description="Start date for filtering"),
    end_date: Optional[date] = Query(None, description="End date for filtering"),
) -> dict[str, Any]:
    """Get writing progress analytics for the current user"""
    validate_date_range(start_date, end_date)

    # Build query for documents
    query = select(Document).where(Document.user_id == current_user.id)

    # Apply date filters if provided
    if start_date:
        query = query.where(
            Document.created_at >= datetime.combine(start_date, datetime.min.time())
        )
    if end_date:
        query = query.where(
            Document.created_at <= datetime.combine(end_date, datetime.max.time())
        )

    query = query.order_by(Document.created_at.desc())

    # Get total counts using database aggregation
    count_query = select(
        func.count(Document.id).label("total_docs"),
        func.sum(Document.word_count).label("total_words"),
    ).where(Document.user_id == current_user.id)

    # Apply date filters if provided
    if start_date:
        count_query = count_query.where(
            Document.created_at >= datetime.combine(start_date, datetime.min.time())
        )
    if end_date:
        count_query = count_query.where(
            Document.created_at <= datetime.combine(end_date, datetime.max.time())
        )

    count_result = await db.execute(count_query)
    total_docs, total_words = count_result.one()
    total_docs = total_docs or 0
    total_words = total_words or 0

    # Get daily progress using database grouping
    daily_query = select(
        func.date(Document.created_at).label("date"),
        func.count(Document.id).label("documents"),
        func.sum(Document.word_count).label("words"),
    ).where(Document.user_id == current_user.id)

    # Apply date filters if provided
    if start_date:
        daily_query = daily_query.where(
            Document.created_at >= datetime.combine(start_date, datetime.min.time())
        )
    if end_date:
        daily_query = daily_query.where(
            Document.created_at <= datetime.combine(end_date, datetime.max.time())
        )

    daily_query = daily_query.group_by(func.date(Document.created_at)).order_by(
        func.date(Document.created_at)
    )

    daily_result = await db.execute(daily_query)
    daily_data = daily_result.all()

    # Convert to response format
    daily_progress_list = [
        {
            "date": row.date.isoformat(),
            "documents": row.documents,
            "words": row.words or 0,
        }
        for row in daily_data
    ]

    return {
        "documents_created": total_docs,
        "total_words": total_words,
        "average_words_per_document": (
            round(total_words / total_docs, 2) if total_docs > 0 else 0
        ),
        "daily_progress": daily_progress_list,
    }


@router.get("/ai-interactions")
async def get_ai_interactions_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    start_date: Optional[date] = Query(None, description="Start date for filtering"),
    end_date: Optional[date] = Query(None, description="End date for filtering"),
) -> dict[str, Any]:
    """Get AI interaction analytics for the current user"""
    validate_date_range(start_date, end_date)

    # Build query - join through reflection and document to ensure user ownership
    query = (
        select(AIInteraction)
        .join(Reflection)
        .join(Document)
        .where(Document.user_id == current_user.id)
    )

    # Apply date filters if provided
    if start_date:
        query = query.where(
            AIInteraction.created_at
            >= datetime.combine(start_date, datetime.min.time())
        )
    if end_date:
        query = query.where(
            AIInteraction.created_at <= datetime.combine(end_date, datetime.max.time())
        )

    # Execute query with reflection relationship
    query = query.options(selectinload(AIInteraction.reflection))
    result = await db.execute(query)
    interactions = result.scalars().all()

    # Analyze interactions
    ai_level_distribution = {"basic": 0, "standard": 0, "advanced": 0}
    interaction_patterns = []

    for interaction in interactions:
        # Count AI levels (use interaction's ai_level, not reflection's)
        ai_level = str(interaction.ai_level) if interaction.ai_level else None
        if ai_level and ai_level in ai_level_distribution:
            ai_level_distribution[ai_level] += 1

        # Analyze question patterns
        interaction_patterns.append(
            {
                "date": interaction.created_at.isoformat(),
                "ai_level": ai_level,
                "response_length": len(interaction.ai_response.split()),
            }
        )

    return {
        "total_interactions": len(interactions),
        "ai_level_distribution": ai_level_distribution,
        "interaction_patterns": interaction_patterns[:50],  # Limit to recent 50
    }


@router.get("/learning-insights")
@cache_response(ttl_seconds=300)  # Cache for 5 minutes
async def get_learning_insights(
    response: FastAPIResponse,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    start_date: Optional[date] = Query(None, description="Start date for filtering"),
    end_date: Optional[date] = Query(None, description="End date for filtering"),
) -> dict[str, Any]:
    """Get comprehensive learning insights for the current user"""
    validate_date_range(start_date, end_date)

    # Get reflections with quality scores
    reflection_query = (
        select(Reflection)
        .join(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Reflection.created_at)
    )

    if start_date:
        reflection_query = reflection_query.where(
            Reflection.created_at >= datetime.combine(start_date, datetime.min.time())
        )
    if end_date:
        reflection_query = reflection_query.where(
            Reflection.created_at <= datetime.combine(end_date, datetime.max.time())
        )

    result = await db.execute(reflection_query)
    reflections = result.scalars().all()

    if not reflections:
        return {
            "reflection_quality_trend": "no_data",
            "engagement_level": "low",
            "strengths": [],
            "areas_for_growth": ["Begin by writing your first reflection"],
        }

    # Analyze quality trend
    if len(reflections) >= 3:
        # For small datasets, compare first half with second half
        midpoint = len(reflections) // 2
        if len(reflections) <= 6:
            # For 3-6 reflections, split in half
            older_reflections = reflections[:midpoint]
            recent_reflections = reflections[midpoint:]
        else:
            # For larger datasets, use first 3 and last 3
            older_reflections = reflections[:3]
            recent_reflections = reflections[-3:]

        recent_avg = sum(r.quality_score for r in recent_reflections) / len(
            recent_reflections
        )
        older_avg = sum(r.quality_score for r in older_reflections) / len(
            older_reflections
        )

        if recent_avg > older_avg + 0.5:
            trend = "improving"
        elif recent_avg < older_avg - 0.5:
            trend = "declining"
        else:
            trend = "stable"
    else:
        trend = "insufficient_data"

    # Determine engagement level
    days_active = len({r.created_at.date() for r in reflections})
    if days_active >= 5:
        engagement = "high"
    elif days_active >= 3:
        engagement = "medium"
    else:
        engagement = "low"

    # Identify strengths and areas for growth
    avg_quality = sum(r.quality_score for r in reflections) / len(reflections)
    avg_length = sum(len(r.content.split()) for r in reflections) / len(reflections)

    strengths = []
    areas_for_growth = []

    if avg_quality >= 7.0:
        strengths.append("Deep, thoughtful reflections")
    else:
        areas_for_growth.append("Develop deeper reflection practices")

    if avg_length >= 150:
        strengths.append("Comprehensive written responses")
    else:
        areas_for_growth.append("Expand on your thoughts in more detail")

    if engagement == "high":
        strengths.append("Consistent engagement with the platform")
    else:
        areas_for_growth.append("Increase frequency of reflections")

    # Count AI interactions
    ai_query = (
        select(func.count(AIInteraction.id))
        .join(Reflection)
        .join(Document)
        .where(Document.user_id == current_user.id)
    )
    ai_count_result = await db.execute(ai_query)
    ai_count = ai_count_result.scalar() or 0

    if ai_count > len(reflections) * 2:
        strengths.append("Active use of AI guidance")

    return {
        "reflection_quality_trend": trend,
        "engagement_level": engagement,
        "strengths": strengths,
        "areas_for_growth": areas_for_growth,
        "average_reflection_quality": round(avg_quality, 2),
        "total_reflections": len(reflections),
        "total_ai_interactions": ai_count,
    }


class ExportRequest(BaseModel):
    format: str  # csv, json, pdf
    data_type: str  # reflections, interactions, progress
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    include_details: Optional[bool] = True


@router.post("/export")
async def export_analytics(
    export_request: ExportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Export analytics data in various formats"""
    # Validate format
    valid_formats = ["csv", "json", "pdf"]
    if export_request.format not in valid_formats:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid export format. Must be one of: {', '.join(valid_formats)}",
        )

    # Validate data type
    valid_data_types = ["reflections", "interactions", "progress"]
    if export_request.data_type not in valid_data_types:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid data type. Must be one of: {', '.join(valid_data_types)}",
        )

    # Validate date range
    validate_date_range(export_request.date_from, export_request.date_to)

    # Create export service
    export_service = ExportService()

    # Generate export based on data type and format
    content: Union[str, bytes] = ""
    media_type = "text/plain"
    filename = "export.txt"

    if export_request.data_type == "reflections":
        if export_request.format == "csv":
            content = await export_service.export_reflections_csv(
                db,
                user_id=str(current_user.id),
                start_date=export_request.date_from,
                end_date=export_request.date_to,
            )
            media_type = "text/csv"
            filename = f"reflections_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        elif export_request.format == "json":
            content = await export_service.export_reflections_json(
                db,
                user_id=str(current_user.id),
                start_date=export_request.date_from,
                end_date=export_request.date_to,
            )
            return Response(
                content=content,
                media_type="application/json",
                headers={
                    "Content-Disposition": (
                        f'attachment; filename="reflections_'
                        f'{datetime.now().strftime("%Y%m%d_%H%M%S")}.json"'
                    )
                },
            )
        else:  # pdf
            content = await export_service.export_reflections_pdf(
                db,
                user_id=str(current_user.id),
                start_date=export_request.date_from,
                end_date=export_request.date_to,
            )
            media_type = "application/pdf"
            filename = f"reflections_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

    elif export_request.data_type == "interactions":
        if export_request.format == "csv":
            content = await export_service.export_ai_interactions_csv(
                db,
                user_id=str(current_user.id),
                start_date=export_request.date_from,
                end_date=export_request.date_to,
            )
            media_type = "text/csv"
            filename = f"ai_interactions_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        else:
            # For now, only CSV is supported for interactions
            raise HTTPException(
                status_code=422,
                detail=f"Format '{export_request.format}' not yet supported for AI interactions",
            )

    else:  # progress
        if export_request.format == "csv":
            content = await export_service.export_writing_progress_csv(
                db,
                user_id=str(current_user.id),
                start_date=export_request.date_from,
                end_date=export_request.date_to,
            )
            media_type = "text/csv"
            filename = (
                f"writing_progress_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            )
        else:
            # For now, only CSV is supported for progress
            raise HTTPException(
                status_code=422,
                detail=f"Format '{export_request.format}' not yet supported for writing progress",
            )

    # Return response with appropriate headers
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
