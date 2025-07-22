"""Immutable update utilities for SQLAlchemy models."""

from datetime import datetime
from typing import Any, TypeVar

from sqlalchemy.orm import class_mapper

T = TypeVar("T")


def create_updated_model(model: T, updates: dict[str, Any]) -> T:
    """
    Create a new instance with updates, preserving immutability.

    Args:
        model: Original SQLAlchemy model instance
        updates: Dictionary of fields to update

    Returns:
        New instance with updates applied
    """
    # Get model class
    model_class = type(model)

    # Get current values
    mapper = class_mapper(model_class)
    current_values = {}

    for col in mapper.columns:
        if hasattr(model, col.name):
            current_values[col.name] = getattr(model, col.name)

    # Apply updates
    new_values = {**current_values, **updates}

    # Create new instance
    return model_class(**new_values)


def update_with_audit(model: T, updates: dict[str, Any]) -> T:
    """
    Update model with automatic audit fields.

    Args:
        model: Original model instance
        updates: Dictionary of fields to update

    Returns:
        New instance with updates and audit fields
    """
    audit_updates = {**updates, "updated_at": datetime.utcnow()}
    return create_updated_model(model, audit_updates)
