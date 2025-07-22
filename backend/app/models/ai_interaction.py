import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.user import User


class Reflection(Base):
    __tablename__ = "reflections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    content = Column(Text, nullable=False)
    word_count = Column(Integer)
    quality_score = Column(Float)  # 1-10 scale
    ai_level_granted = Column(String)  # basic, standard, advanced
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="reflections")
    document: Mapped["Document"] = relationship(
        "Document", back_populates="reflections"
    )
    ai_interactions: Mapped[list["AIInteraction"]] = relationship(
        "AIInteraction", back_populates="reflection"
    )


class AIInteraction(Base):
    __tablename__ = "ai_interactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    reflection_id = Column(String, ForeignKey("reflections.id"))

    user_message = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    ai_level = Column(String)  # basic, standard, advanced

    # Learning analytics
    response_time_ms = Column(Integer)
    token_count = Column(Integer)
    question_type = Column(String)  # clarifying, analytical, critical

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="ai_interactions")
    document: Mapped["Document"] = relationship(
        "Document", back_populates="ai_interactions"
    )
    reflection: Mapped[Optional["Reflection"]] = relationship(
        "Reflection", back_populates="ai_interactions"
    )
