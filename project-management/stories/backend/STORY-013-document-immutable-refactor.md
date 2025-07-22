# STORY-013: Document Update Immutability

**Epic**: [EPIC-002](../../epics/EPIC-002-data-immutability.md)
**Priority**: 🔴 HIGH
**Points**: 5
**Sprint**: 2
**Status**: ✅ COMPLETED

## User Story

AS A developer following CLAUDE.md principles
I WANT to refactor document updates to use immutable patterns
SO THAT we maintain data integrity and auditability

## Context

Current code directly mutates SQLAlchemy models:

```python
# Current anti-pattern in backend/app/api/documents.py
document.title = document_update.title
document.content = document_update.content
document.updated_at = datetime.utcnow()
```

This violates our immutability principle and makes it harder to track changes.

## Acceptance Criteria

- [ ] Create immutable update utility for SQLAlchemy
- [ ] Refactor all document mutations
- [ ] Maintain all existing functionality
- [ ] All existing tests still pass
- [ ] New tests for immutable patterns
- [ ] Document versioning still works

## Technical Tasks

### Task 1: Write failing tests first (TDD!)

```python
# backend/tests/test_immutable_patterns.py
import pytest
from app.utils.immutable import create_updated_model
from app.models.document import Document

def test_create_updated_model_returns_new_instance():
    """Test that updates create new instances, not mutate"""
    original = Document(
        id="123",
        title="Original Title",
        content="Original content",
        word_count=2
    )

    updated = create_updated_model(
        original,
        {"title": "New Title", "content": "New content"}
    )

    # Original unchanged
    assert original.title == "Original Title"
    assert original.content == "Original content"

    # New instance has updates
    assert updated.title == "New Title"
    assert updated.content == "New content"
    assert updated.id == original.id  # ID preserved

def test_document_update_maintains_audit_trail():
    """Test that updates preserve history"""
    # Test the complete update flow maintains versions
```

### Task 2: Create immutable update utility

```python
# backend/app/utils/immutable.py
from typing import TypeVar, Dict, Any
from sqlalchemy.orm import class_mapper
from datetime import datetime

T = TypeVar('T')

def create_updated_model(model: T, updates: Dict[str, Any]) -> T:
    """
    Create a new instance with updates, preserving immutability

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

def update_with_audit(model: T, updates: Dict[str, Any]) -> T:
    """Update model with automatic audit fields"""
    audit_updates = {
        **updates,
        'updated_at': datetime.utcnow(),
        'version': getattr(model, 'version', 0) + 1
    }
    return create_updated_model(model, audit_updates)
```

### Task 3: Refactor document update endpoint

```python
# backend/app/api/documents.py
from app.utils.immutable import update_with_audit

@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    document_update: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Get existing document (unchanged)
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.is_deleted == False
            )
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # Create updates dictionary
    updates = {}
    if document_update.title is not None:
        updates['title'] = document_update.title

    if document_update.content is not None:
        updates['content'] = document_update.content
        updates['word_count'] = len(document_update.content.split())

    # Create new document instance (immutable)
    updated_document = update_with_audit(document, updates)

    # Merge into session (SQLAlchemy will handle the update)
    db.merge(updated_document)

    # Create version record if content changed
    if 'content' in updates:
        # Version creation remains the same
        result = await db.execute(
            select(DocumentVersion)
            .where(DocumentVersion.document_id == document_id)
            .order_by(desc(DocumentVersion.version_number))
            .limit(1)
        )
        last_version = result.scalar_one_or_none()

        new_version = DocumentVersion(
            document_id=document.id,
            version_number=(last_version.version_number + 1) if last_version else 1,
            content=updated_document.content,
            word_count=updated_document.word_count
        )
        db.add(new_version)

    await db.commit()
    await db.refresh(updated_document)

    return DocumentResponse(
        id=updated_document.id,
        title=updated_document.title,
        content=updated_document.content,
        word_count=updated_document.word_count,
        created_at=updated_document.created_at,
        updated_at=updated_document.updated_at
    )
```

### Task 4: Add integration tests

```python
# backend/tests/api/test_document_immutability.py
async def test_document_update_preserves_immutability(
    client: AsyncClient,
    test_user_headers: dict,
    test_document: Document
):
    """Test that document updates don't mutate original"""
    # Get original state
    original_title = test_document.title
    original_content = test_document.content

    # Update document
    update_data = {
        "title": "Updated Title",
        "content": "Updated content here"
    }

    response = await client.put(
        f"/api/documents/{test_document.id}",
        json=update_data,
        headers=test_user_headers
    )

    assert response.status_code == 200
    updated = response.json()

    # Verify response
    assert updated["title"] == "Updated Title"
    assert updated["content"] == "Updated content here"

    # Verify original object unchanged (in memory)
    assert test_document.title == original_title
    assert test_document.content == original_content
```

### Task 5: Update other mutation points

```python
# Find and refactor other mutations
# - User profile updates
# - Reflection scoring updates
# - Any other direct assignments
```

## Definition of Done

- [ ] All tests written first and failing
- [ ] Immutable utility implemented
- [ ] All document mutations refactored
- [ ] All tests passing
- [ ] No performance degradation
- [ ] Team code review completed

## Notes

This refactor sets the pattern for all future immutable updates. Make sure the utility is well-documented so other developers understand how to use it correctly.
