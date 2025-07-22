# API Reference

## Overview

The Scribe Tree Writer API is a RESTful API that provides programmatic access to the platform's features. All endpoints return JSON responses.

## Base URL

```
http://localhost:8000/api
```

For production deployments, replace with your actual domain.

## Authentication

The API uses JWT (JSON Web Token) authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Getting a Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

Response:

```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

## Endpoints

### Authentication

#### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Documents

#### List Documents

```http
GET /api/documents
Authorization: Bearer <token>
```

Response:

```json
[
  {
    "id": "uuid",
    "title": "My Essay",
    "word_count": 250,
    "updated_at": "2025-01-15T10:30:00Z"
  }
]
```

#### Create Document

```http
POST /api/documents
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New Document",
  "content": "Initial content"
}
```

#### Get Document

```http
GET /api/documents/{document_id}
Authorization: Bearer <token>
```

#### Update Document

```http
PUT /api/documents/{document_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content"
}
```

#### Delete Document

```http
DELETE /api/documents/{document_id}
Authorization: Bearer <token>
```

### AI Partner

#### Submit Reflection

```http
POST /api/ai/reflect
Authorization: Bearer <token>
Content-Type: application/json

{
  "reflection": "I'm writing about climate change and...",
  "document_id": "uuid"
}
```

Response:

```json
{
  "access_granted": true,
  "quality_score": 7.5,
  "ai_level": "standard",
  "feedback": "Your reflection shows thoughtful engagement...",
  "initial_questions": [
    "What specific aspect of climate change interests you most?",
    "What evidence supports your current perspective?"
  ]
}
```

#### Ask AI Question

```http
POST /api/ai/ask
Authorization: Bearer <token>
Content-Type: application/json

{
  "question": "How should I structure my argument?",
  "context": "I'm trying to argue that...",
  "document_id": "uuid",
  "ai_level": "standard"
}
```

Response:

```json
{
  "response": "Let's think about your argument structure. What main claim are you making?",
  "question_type": "analytical",
  "follow_up_prompts": [
    "Consider your audience",
    "Think about counterarguments"
  ]
}
```

### Analytics

#### Get Reflection Analytics

```http
GET /api/analytics/reflections?days=30
Authorization: Bearer <token>
```

Response:

```json
{
  "average_quality": 6.8,
  "total_reflections": 25,
  "quality_trend": [
    { "date": "2025-01-01", "average_quality": 6.2 },
    { "date": "2025-01-02", "average_quality": 6.5 }
  ]
}
```

#### Get Writing Progress

```http
GET /api/analytics/writing-progress?days=30
Authorization: Bearer <token>
```

Response:

```json
{
  "total_words": 5000,
  "documents_created": 10,
  "daily_progress": [
    { "date": "2025-01-01", "words": 250 },
    { "date": "2025-01-02", "words": 300 }
  ]
}
```

#### Export Analytics

```http
POST /api/analytics/export
Authorization: Bearer <token>
Content-Type: application/json

{
  "format": "csv",
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "include_reflections": true,
  "include_ai_interactions": true
}
```

### Writing Style Analysis

#### Analyze Document Style

```http
POST /api/analytics/style-analysis
Authorization: Bearer <token>
Content-Type: application/json

{
  "document_id": "uuid",
  "include_history": true
}
```

Response:

```json
{
  "metrics": {
    "average_sentence_length": 18.5,
    "vocabulary_diversity": 0.65,
    "paragraph_count": 5,
    "readability_score": 72
  },
  "questions": [
    "Your sentences tend to be long. How might shorter sentences impact clarity?",
    "What tone are you aiming for in this piece?"
  ]
}
```

## Rate Limits

- Authentication endpoints: 5 requests per minute
- AI endpoints: 30 requests per minute
- General API endpoints: 60 requests per minute
- Analytics endpoints: 100 requests per minute

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1640995200
```

## Error Responses

All errors follow a consistent format:

```json
{
  "detail": "Error message here",
  "error_code": "SPECIFIC_ERROR_CODE"
}
```

Common HTTP status codes:

- 400: Bad Request (invalid input)
- 401: Unauthorized (missing or invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 429: Too Many Requests (rate limit exceeded)
- 500: Internal Server Error

## Data Types

### Document

```json
{
  "id": "string (UUID)",
  "title": "string",
  "content": "string",
  "word_count": "integer",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp"
}
```

### Reflection

```json
{
  "id": "string (UUID)",
  "document_id": "string (UUID)",
  "reflection_text": "string",
  "quality_score": "float (1-10)",
  "ai_level_granted": "string (basic|standard|advanced)",
  "created_at": "ISO 8601 timestamp"
}
```

### AI Interaction

```json
{
  "id": "string (UUID)",
  "document_id": "string (UUID)",
  "user_message": "string",
  "ai_response": "string",
  "question_type": "string",
  "created_at": "ISO 8601 timestamp"
}
```

## Webhooks (Coming Soon)

Future versions will support webhooks for:

- Document creation/updates
- Reflection submissions
- Milestone achievements

## SDK Support

Official SDKs are planned for:

- Python
- JavaScript/TypeScript
- Ruby

## API Versioning

The API uses URL versioning. The current version is v1 (implicit in the URLs above). Future versions will use:

```
/api/v2/documents
```

## Testing

For testing, use the provided test API keys and the staging environment:

```
https://staging-api.scribetreewriter.com
```

## Support

For API support:

- Check the API status page
- Review common issues in the FAQ
- Contact the development team
