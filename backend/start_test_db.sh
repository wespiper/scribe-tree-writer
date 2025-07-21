#!/bin/bash

# Script to start PostgreSQL for testing using Docker

echo "Starting PostgreSQL test database..."

# Stop and remove existing container if it exists
docker stop scribe-test-db 2>/dev/null || true
docker rm scribe-test-db 2>/dev/null || true

# Start PostgreSQL container
docker run -d \
  --name scribe-test-db \
  -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=scribe_test \
  postgres:14-alpine

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Check if it's running
docker ps | grep scribe-test-db

echo "PostgreSQL test database is ready!"
echo "Connection string: postgresql://postgres:postgres@localhost:5432/scribe_test"
echo ""
echo "To stop the database: docker stop scribe-test-db"
echo "To remove it: docker rm scribe-test-db"