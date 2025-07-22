# TASK-010-005: Create Test Utilities

**Story**: [STORY-010](../../stories/infrastructure/STORY-010-pytest-setup.md)
**Status**: ✅ Completed
**Completed**: July 20, 2025
**Assignee**: Dev

## Task Description

Create utility functions to simplify common test operations.

## Completed Actions

- Created user creation helpers (via API and database)
- Created document creation helpers
- Created reflection submission helper
- Created AI response helper
- Added assertion helpers:
  - assert_is_question() - verifies AI asks questions
  - assert_no_direct_answers() - ensures AI doesn't generate content

## Files Created

- `/backend/tests/utils.py`

## Key Functions

- `create_test_user()` - Creates user and returns auth headers
- `create_test_document()` - Creates document via API
- `submit_reflection()` - Submits reflection and gets AI access
- `get_ai_response()` - Gets AI response for testing
