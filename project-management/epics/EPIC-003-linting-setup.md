# EPIC-003: Linting and Formatting Configuration

**Priority**: 🟡 MEDIUM  
**Status**: Not Started  
**Epic Owner**: TBD  
**Target Completion**: Sprint 6  

## Problem Statement

Frontend lacks proper linting configuration despite having ESLint in dependencies. CLAUDE.md requires: "All linters must run automatically on file save. No exceptions."

## Goals

1. Complete frontend linting setup (ESLint + Prettier)
2. Ensure backend linting is properly configured
3. Add pre-commit hooks
4. VS Code settings for auto-format on save
5. CI/CD linting checks

## Success Criteria

- [ ] Frontend: ESLint config with strict rules
- [ ] Frontend: Prettier integrated with ESLint
- [ ] Backend: Ruff/Black running on save
- [ ] Pre-commit hooks preventing bad commits
- [ ] VS Code settings.json in repo
- [ ] CI/CD fails on linting errors

## User Stories

### Frontend Configuration
- [STORY-019](../stories/frontend/STORY-019-eslint-setup.md): ESLint Configuration
- [STORY-020](../stories/frontend/STORY-020-prettier-setup.md): Prettier Integration
- [STORY-021](../stories/frontend/STORY-021-typescript-lint-rules.md): TypeScript-Specific Rules

### Backend Verification
- [STORY-022](../stories/backend/STORY-022-ruff-black-verify.md): Verify Ruff/Black Setup

### Developer Experience
- [STORY-023](../stories/infrastructure/STORY-023-vscode-settings.md): VS Code Settings
- [STORY-024](../stories/infrastructure/STORY-024-precommit-hooks.md): Pre-commit Hooks
- [STORY-025](../stories/infrastructure/STORY-025-ci-linting.md): CI/CD Linting

## Technical Specifications

### Frontend ESLint Config
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    'no-console': 'warn',
    // Educational integrity rules
    'no-eval': 'error',
    'no-implied-eval': 'error'
  }
}
```

### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[python]": {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports": true
    }
  }
}
```

## Implementation Order

1. Frontend ESLint setup (most critical gap)
2. Prettier integration
3. VS Code settings
4. Pre-commit hooks
5. CI/CD integration

## Benefits

1. **Consistency**: Same code style across team
2. **Quality**: Catch issues before commit
3. **Productivity**: No manual formatting
4. **Onboarding**: New devs follow standards automatically

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Too strict rules slow development | Low | Start permissive, tighten gradually |
| Conflicts with existing code | Medium | Auto-fix what's possible, manual review rest |
| Developer pushback | Low | Show productivity benefits |

## Dependencies

- Should complete after main test infrastructure (EPIC-001)

## Notes

Good linting setup is invisible when working but invaluable for maintaining code quality. It's especially important in an educational product where code clarity directly impacts our ability to enhance student learning.