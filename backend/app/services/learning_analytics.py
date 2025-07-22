import json
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_interaction import AIInteraction, Reflection
from app.models.document import Document


class LearningAnalyticsService:
    """Track and analyze learning patterns with AI interactions"""

    async def track_reflection(
        self, user_id: str, document_id: str, quality_score: float, ai_level: str
    ):
        """Track reflection submission for analytics"""
        # In MVP, we'll keep this simple
        # In production, this would write to a time-series database
        analytics_data = {
            "user_id": user_id,
            "document_id": document_id,
            "quality_score": quality_score,
            "ai_level": ai_level,
            "timestamp": datetime.utcnow().isoformat(),
        }
        # For now, just log it
        print(f"Reflection tracked: {json.dumps(analytics_data)}")

    async def track_ai_interaction(
        self,
        user_id: str,
        document_id: str,
        interaction_type: str,
        response_time_ms: int,
    ):
        """Track AI interaction for analytics"""
        analytics_data = {
            "user_id": user_id,
            "document_id": document_id,
            "interaction_type": interaction_type,
            "response_time_ms": response_time_ms,
            "timestamp": datetime.utcnow().isoformat(),
        }
        print(f"AI interaction tracked: {json.dumps(analytics_data)}")

    async def calculate_learning_metrics(self, user_id: str, db: AsyncSession) -> dict:
        """Calculate comprehensive learning metrics for a user"""

        # Get reflection statistics using database aggregation
        reflection_stats = await db.execute(
            select(
                func.count(Reflection.id).label("count"),
                func.avg(Reflection.quality_score).label("avg_score"),
            ).where(Reflection.user_id == user_id)
        )
        total_reflections, avg_reflection_score = reflection_stats.one()
        total_reflections = total_reflections or 0
        avg_reflection_score = (
            float(avg_reflection_score) if avg_reflection_score else 0.0
        )

        # Calculate reflection trend using window functions if we have enough data
        reflection_trend = "insufficient_data"
        if total_reflections >= 2:
            # Get first half and second half averages
            halfway_point = await db.execute(
                select(Reflection.created_at)
                .where(Reflection.user_id == user_id)
                .order_by(Reflection.created_at)
                .limit(1)
                .offset(total_reflections // 2)
            )
            midpoint_date = halfway_point.scalar()

            if midpoint_date:
                # Calculate averages for each half
                early_avg_result = await db.execute(
                    select(func.avg(Reflection.quality_score)).where(
                        Reflection.user_id == user_id,
                        Reflection.created_at < midpoint_date,
                    )
                )
                early_avg = float(early_avg_result.scalar() or 0)

                recent_avg_result = await db.execute(
                    select(func.avg(Reflection.quality_score)).where(
                        Reflection.user_id == user_id,
                        Reflection.created_at >= midpoint_date,
                    )
                )
                recent_avg = float(recent_avg_result.scalar() or 0)

                reflection_trend = "improving" if recent_avg > early_avg else "stable"

        # Get AI interaction patterns
        result = await db.execute(
            select(
                func.count(AIInteraction.id).label("total_interactions"),
                func.avg(AIInteraction.response_time_ms).label("avg_response_time"),
                AIInteraction.question_type,
            )
            .where(AIInteraction.user_id == user_id)
            .group_by(AIInteraction.question_type)
        )
        interaction_stats = result.all()

        # Calculate dependency ratio
        result = await db.execute(
            select(func.count(Document.id).label("total_documents")).where(
                Document.user_id == user_id
            )
        )
        total_documents = result.scalar() or 0

        result = await db.execute(
            select(
                func.count(func.distinct(AIInteraction.document_id)).label(
                    "documents_with_ai"
                )
            ).where(AIInteraction.user_id == user_id)
        )
        documents_with_ai = result.scalar() or 0

        ai_dependency_ratio = (
            (documents_with_ai / total_documents) if total_documents > 0 else 0
        )

        # Build metrics response
        return {
            "reflection_quality_trend": reflection_trend,
            "average_reflection_score": round(avg_reflection_score, 2),
            "total_reflections": total_reflections,
            "ai_dependency_ratio": ai_dependency_ratio,
            "interaction_breakdown": {
                stat.question_type: {
                    "count": stat.total_interactions,
                    "avg_response_time_ms": (
                        float(stat.avg_response_time) if stat.avg_response_time else 0
                    ),
                }
                for stat in interaction_stats
            },
            "total_ai_interactions": sum(
                stat.total_interactions for stat in interaction_stats
            ),
            "independence_score": max(0, 1 - ai_dependency_ratio) * 10,  # 0-10 scale
        }

    async def get_document_analytics(self, document_id: str, db: AsyncSession) -> dict:
        """Get analytics for a specific document"""

        # Get interaction count
        result = await db.execute(
            select(func.count(AIInteraction.id)).where(
                AIInteraction.document_id == document_id
            )
        )
        interaction_count = result.scalar() or 0

        # Get reflection history
        result = await db.execute(
            select(Reflection)
            .where(Reflection.document_id == document_id)
            .order_by(Reflection.created_at.desc())
        )
        reflections = result.scalars().all()

        return {
            "document_id": document_id,
            "total_ai_interactions": interaction_count,
            "reflection_count": len(reflections),
            "latest_reflection_score": (
                reflections[0].quality_score if reflections else None
            ),
            "reflection_history": [
                {
                    "quality_score": r.quality_score,
                    "ai_level": r.ai_level_granted,
                    "created_at": r.created_at.isoformat(),
                }
                for r in reflections
            ],
        }
