# Scribe Tree Writer - Project Management

## Overview

This directory contains our agile project management artifacts organized to address critical issues identified in our CLAUDE.md compliance audit.

## Structure

```
project-management/
├── README.md                # This file
├── ROADMAP.md              # High-level project roadmap
├── epics/                  # Major feature areas
│   ├── EPIC-001-tdd-implementation.md
│   ├── EPIC-002-data-immutability.md
│   └── EPIC-003-linting-setup.md
├── stories/                # User stories broken down from epics
│   ├── backend/
│   └── frontend/
├── tasks/                  # Specific implementation tasks
│   ├── backend/
│   └── frontend/
└── sprints/               # Sprint planning documents
    └── sprint-01.md
```

## Priority Levels

- 🚨 **CRITICAL**: Blocks all development (TDD violations)
- 🔴 **HIGH**: Major architectural issues (data mutations)
- 🟡 **MEDIUM**: Important but not blocking (linting setup)
- 🟢 **LOW**: Nice to have improvements

## Key Principles

1. **Test-First Development**: Every story MUST include test writing as the first task
2. **Small Iterations**: Break work into small, testable chunks
3. **Continuous Integration**: Each task should leave the codebase in a working state
4. **Educational Integrity**: All changes must support our core mission of enhancing student thinking

## Current Status

- **Total Epics**: 3
- **Total Stories**: TBD
- **Current Sprint**: Sprint 1 (Planning)

## Getting Started

1. Review `ROADMAP.md` for the big picture
2. Check current sprint in `sprints/`
3. Pick a story from the current sprint
4. Follow TDD workflow: Red → Green → Refactor