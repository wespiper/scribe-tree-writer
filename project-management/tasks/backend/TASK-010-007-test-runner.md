# TASK-010-007: Create Test Runner Script

**Story**: [STORY-010](../../stories/infrastructure/STORY-010-pytest-setup.md)
**Status**: ✅ Completed
**Completed**: July 20, 2025
**Assignee**: Dev

## Task Description

Create a test runner script that handles environment variables and virtual environment activation.

## Completed Actions

- Created run_tests.sh script
- Configured to load environment variables from parent .env.local
- Set up test database URL override
- Made script executable
- Added support for passing pytest arguments

## Files Created

- `/backend/run_tests.sh`
- `/backend/.env.test` (example test environment)

## Features

- Automatic venv activation
- Environment variable loading from .env.local
- Test database isolation
- Full pytest argument passthrough

## Usage

```bash
./run_tests.sh                    # Run all tests
./run_tests.sh -v                 # Verbose output
./run_tests.sh --cov=app          # With coverage
./run_tests.sh tests/test_file.py # Specific file
```
