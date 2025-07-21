# EPIC-002: Data Immutability Refactor

**Priority**: 🔴 HIGH  
**Status**: Not Started  
**Epic Owner**: TBD  
**Target Completion**: Sprint 2-3  

## Problem Statement

Multiple violations of CLAUDE.md's immutability requirement found in backend code:
- Direct mutation of SQLAlchemy models (`document.title = ...`)
- No immutable update patterns
- Violates principle: "Immutable data only - No mutations in either Python or TypeScript"

## Goals

1. Refactor all data mutations to immutable patterns
2. Establish immutable update utilities
3. Ensure all future code follows immutable patterns
4. Maintain data integrity and auditability

## Success Criteria

- [ ] Zero direct mutations in codebase
- [ ] All updates use immutable patterns
- [ ] Update utilities tested and documented
- [ ] Team trained on immutable patterns
- [ ] Linting rules catch mutations

## User Stories

### Backend Refactoring
- [STORY-013](../stories/backend/STORY-013-document-immutable-refactor.md): Document Update Immutability
- [STORY-014](../stories/backend/STORY-014-reflection-immutable-pattern.md): Reflection Creation Pattern
- [STORY-015](../stories/backend/STORY-015-user-update-pattern.md): User Profile Immutability

### Utility Development
- [STORY-016](../stories/backend/STORY-016-immutable-update-utils.md): Create Immutable Update Utilities
- [STORY-017](../stories/backend/STORY-017-sqlalchemy-patterns.md): SQLAlchemy Immutable Patterns

### Frontend Verification
- [STORY-018](../stories/frontend/STORY-018-state-immutability-audit.md): State Management Immutability Audit

## Technical Approach

### Current Anti-Pattern
```python
# BAD - Direct mutation
document.title = document_update.title
document.content = document_update.content
document.updated_at = datetime.utcnow()
await db.commit()
```

### Target Pattern
```python
# GOOD - Immutable update
updated_document = update_document(
    document=document,
    updates={
        "title": document_update.title,
        "content": document_update.content,
        "updated_at": datetime.utcnow()
    }
)
db.add(updated_document)
await db.commit()
```

## Implementation Strategy

1. **Create update utilities first** (with tests!)
2. **Refactor one module at a time**
3. **Each refactor must maintain all tests**
4. **Add linting rules to prevent regression**

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance impact | Medium | Benchmark critical paths |
| Developer confusion | Medium | Clear examples and training |
| Regression to mutations | High | Automated linting rules |

## Dependencies

- EPIC-001: Need tests before refactoring

## Benefits

1. **Auditability**: Every change creates a new version
2. **Debugging**: Can trace state changes
3. **Concurrency**: Reduces race conditions
4. **Testing**: Easier to test pure functions

## Notes

Immutability isn't just a nice-to-have - it's essential for maintaining the integrity of our educational data. When we track how students think and learn, we need a complete audit trail.