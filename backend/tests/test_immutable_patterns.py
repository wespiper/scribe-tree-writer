from datetime import datetime

import pytest

from app.models.document import Document
from app.utils.immutable import create_updated_model, update_with_audit


class TestImmutablePatterns:
    """Test suite for immutable update patterns."""

    def test_create_updated_model_returns_new_instance(self):
        """Test that updates create new instances, not mutate."""
        original = Document(
            id="123",
            title="Original Title",
            content="Original content",
            word_count=2,
            user_id="user-123",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        updated = create_updated_model(
            original, {"title": "New Title", "content": "New content"}
        )

        # Original unchanged
        assert original.title == "Original Title"
        assert original.content == "Original content"

        # New instance has updates
        assert updated.title == "New Title"
        assert updated.content == "New content"
        assert updated.id == original.id  # ID preserved
        assert updated.user_id == original.user_id  # User ID preserved

    def test_update_with_audit_adds_timestamp(self):
        """Test that audit updates add updated_at timestamp."""
        original_time = datetime.utcnow()
        original = Document(
            id="123",
            title="Original Title",
            content="Original content",
            word_count=2,
            user_id="user-123",
            created_at=original_time,
            updated_at=original_time,
        )

        updated = update_with_audit(original, {"title": "Updated Title"})

        # Check audit fields
        assert updated.updated_at > original.updated_at
        assert updated.title == "Updated Title"

    def test_immutable_update_preserves_unchanged_fields(self):
        """Test that only specified fields are updated."""
        original = Document(
            id="123",
            title="Original Title",
            content="Original content",
            word_count=2,
            user_id="user-123",
            is_deleted=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        # Update only title
        updated = create_updated_model(original, {"title": "New Title"})

        # Unchanged fields preserved
        assert updated.content == original.content
        assert updated.word_count == original.word_count
        assert updated.is_deleted == original.is_deleted
        assert updated.user_id == original.user_id

    def test_immutable_update_handles_none_values(self):
        """Test that None values can be set through immutable update."""
        original = Document(
            id="123",
            title="Original Title",
            content="Original content",
            word_count=2,
            user_id="user-123",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        # Set title to None (though this might not be allowed by the model)
        updated = create_updated_model(original, {"title": None})

        assert updated.title is None
        assert updated.content == original.content  # Other fields unchanged

    def test_immutable_update_with_nested_objects(self):
        """Test immutable updates work with nested Pydantic models."""
        # This test will ensure our pattern works with complex objects
        pass  # Will implement when we have nested models
