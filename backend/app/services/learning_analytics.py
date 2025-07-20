from typing import Dict, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
import json

from app.models.ai_interaction import AIInteraction, Reflection
from app.models.document import Document


class LearningAnalyticsService:
    """Track and analyze learning patterns with AI interactions"""
    
    async def track_reflection(
        self, 
        user_id: str, 
        document_id: str, 
        quality_score: float,
        ai_level: str
    ):
        """Track reflection submission for analytics"""
        # In MVP, we'll keep this simple
        # In production, this would write to a time-series database
        analytics_data = {
            "user_id": user_id,
            "document_id": document_id,
            "quality_score": quality_score,
            "ai_level": ai_level,
            "timestamp": datetime.utcnow().isoformat()
        }
        # For now, just log it
        print(f"Reflection tracked: {json.dumps(analytics_data)}")
    
    async def track_ai_interaction(
        self,
        user_id: str,
        document_id: str,
        interaction_type: str,
        response_time_ms: int
    ):
        """Track AI interaction for analytics"""
        analytics_data = {
            "user_id": user_id,
            "document_id": document_id,
            "interaction_type": interaction_type,
            "response_time_ms": response_time_ms,
            "timestamp": datetime.utcnow().isoformat()
        }
        print(f"AI interaction tracked: {json.dumps(analytics_data)}")
    
    async def calculate_learning_metrics(
        self, 
        user_id: str,
        db: AsyncSession
    ) -> Dict:
        """Calculate comprehensive learning metrics for a user"""
        
        # Get reflection quality trend
        result = await db.execute(
            select(
                Reflection.quality_score,
                Reflection.created_at
            )
            .where(Reflection.user_id == user_id)
            .order_by(Reflection.created_at)
        )
        reflections = result.all()
        
        # Calculate reflection trend
        if len(reflections) >= 2:
            early_avg = sum(r.quality_score for r in reflections[:len(reflections)//2]) / (len(reflections)//2)
            recent_avg = sum(r.quality_score for r in reflections[len(reflections)//2:]) / (len(reflections) - len(reflections)//2)
            reflection_trend = "improving" if recent_avg > early_avg else "stable"
        else:
            reflection_trend = "insufficient_data"
        
        # Get AI interaction patterns
        result = await db.execute(
            select(
                func.count(AIInteraction.id).label('total_interactions'),
                func.avg(AIInteraction.response_time_ms).label('avg_response_time'),
                AIInteraction.question_type
            )
            .where(AIInteraction.user_id == user_id)
            .group_by(AIInteraction.question_type)
        )
        interaction_stats = result.all()
        
        # Calculate dependency ratio
        result = await db.execute(
            select(
                func.count(Document.id).label('total_documents')
            )
            .where(Document.user_id == user_id)
        )
        total_documents = result.scalar() or 0
        
        result = await db.execute(
            select(
                func.count(func.distinct(AIInteraction.document_id)).label('documents_with_ai')
            )
            .where(AIInteraction.user_id == user_id)
        )
        documents_with_ai = result.scalar() or 0
        
        ai_dependency_ratio = (documents_with_ai / total_documents) if total_documents > 0 else 0
        
        # Build metrics response
        return {
            "reflection_quality_trend": reflection_trend,
            "average_reflection_score": sum(r.quality_score for r in reflections) / len(reflections) if reflections else 0,
            "total_reflections": len(reflections),
            "ai_dependency_ratio": ai_dependency_ratio,
            "interaction_breakdown": {
                stat.question_type: {
                    "count": stat.total_interactions,
                    "avg_response_time_ms": float(stat.avg_response_time) if stat.avg_response_time else 0
                }
                for stat in interaction_stats
            },
            "total_ai_interactions": sum(stat.total_interactions for stat in interaction_stats),
            "independence_score": max(0, 1 - ai_dependency_ratio) * 10  # 0-10 scale
        }
    
    async def get_document_analytics(
        self,
        document_id: str,
        db: AsyncSession
    ) -> Dict:
        """Get analytics for a specific document"""
        
        # Get interaction count
        result = await db.execute(
            select(func.count(AIInteraction.id))
            .where(AIInteraction.document_id == document_id)
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
            "latest_reflection_score": reflections[0].quality_score if reflections else None,
            "reflection_history": [
                {
                    "quality_score": r.quality_score,
                    "ai_level": r.ai_level_granted,
                    "created_at": r.created_at.isoformat()
                }
                for r in reflections
            ]
        }