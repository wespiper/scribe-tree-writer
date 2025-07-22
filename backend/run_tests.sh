#!/bin/bash

# Activate virtual environment
source venv/bin/activate

# Load environment variables from .env.local if it exists
if [ -f "../.env.local" ]; then
    export $(grep -v '^#' ../.env.local | xargs)
fi

# Set test environment variables (override or provide defaults)
export DATABASE_URL="postgresql://postgres:postgres@localhost/scribe_test"
export SECRET_KEY="${SECRET_KEY:-test-secret-key-for-testing}"
export OPENAI_API_KEY="${OPENAI_API_KEY:-test-openai-key}"
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-test-anthropic-key}"

# Run pytest with all arguments passed through
python -m pytest "$@"
