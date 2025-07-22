# Error Monitoring & Logging Guide

## Overview

Scribe Tree Writer uses Sentry for error monitoring and structured logging to track issues in production and provide insights into application health.

## Sentry Integration

### Backend Setup

The backend uses `sentry-sdk` with FastAPI integration to automatically capture errors and performance data.

**Configuration (Environment Variables):**
```bash
# .env
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ENVIRONMENT=production  # or development, staging
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
ENABLE_SENTRY=true
```

**Features:**
- Automatic error capture for unhandled exceptions
- Performance monitoring for API endpoints
- Custom error filtering to prevent PII exposure
- Structured logging with `structlog`
- Integration with SQLAlchemy for database query tracking

### Frontend Setup

The frontend uses `@sentry/react` for error and performance monitoring.

**Configuration (Environment Variables):**
```bash
# .env.local
VITE_SENTRY_DSN=your_sentry_dsn_here
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_APP_VERSION=0.1.0
```

**Features:**
- React error boundaries with custom UI
- Performance monitoring for route changes
- User session tracking (without PII)
- Breadcrumb tracking for user actions
- Custom error filtering

## Structured Logging

### Backend Logging

We use `structlog` for structured JSON logging in production:

```python
from app.core.monitoring import logger

# Basic logging
logger.info("User action", user_id=user.id, action="document_created")

# Error logging with context
logger.error(
    "API call failed",
    service="openai",
    error=str(e),
    user_id=user.id,
    document_id=document.id
)

# Performance logging
logger.debug("Query executed", duration=elapsed_time, query=query_name)
```

### Frontend Logging

Use the Sentry helpers for tracking user actions:

```typescript
import { trackUserAction, captureError } from '@/lib/sentry';

// Track user actions
trackUserAction('reflection_submitted', {
  documentId: document.id,
  wordCount: reflection.length
});

// Capture custom errors
try {
  await riskyOperation();
} catch (error) {
  captureError(error as Error, {
    context: 'document_save',
    documentId: document.id
  });
}
```

## Error Tracking

### Custom Error Classes

The backend defines custom error classes for business logic errors:

```python
from app.core.monitoring import (
    BusinessLogicError,
    AIServiceError,
    ReflectionQualityError,
    DocumentAccessError,
    track_custom_error
)

# Example usage
try:
    result = await ai_service.generate_questions(prompt)
except Exception as e:
    error = AIServiceError(f"Failed to generate questions: {str(e)}")
    track_custom_error(error, {
        "prompt_length": len(prompt),
        "user_id": user.id
    })
    raise error
```

### Error Boundaries

React components are wrapped with error boundaries:

```typescript
import { ErrorBoundary } from '@/components/Common/ErrorBoundary';

// Wrap routes
<ErrorBoundary>
  <ProtectedRoute>
    <EditorPage />
  </ProtectedRoute>
</ErrorBoundary>

// Or use HOC
import { withErrorBoundary } from '@/components/Common/ErrorBoundary';

const SafeComponent = withErrorBoundary(RiskyComponent);
```

## Performance Monitoring

### Backend Performance

Use the performance decorator for critical functions:

```python
from app.core.monitoring import measure_performance

@measure_performance("reflection_quality_assessment", op="ai")
async def assess_reflection_quality(reflection: str) -> float:
    # Function implementation
    pass
```

### Frontend Performance

Monitor API calls and critical operations:

```typescript
import { measureApiCall } from '@/lib/sentry';

// Wrap API calls
const document = await measureApiCall(
  'fetch_document',
  () => api.getDocument(documentId)
);
```

## Security & Privacy

### Data Filtering

Both backend and frontend filter sensitive data before sending to Sentry:

**Backend Filtering:**
- Passwords, tokens, and API keys are redacted
- User emails are removed from error context
- 4xx errors are not sent (client errors)
- Health check endpoints are excluded

**Frontend Filtering:**
- User emails are redacted
- Console.log breadcrumbs are excluded
- Password fields in requests are redacted
- Network errors in development are filtered

### PII Protection

- `send_default_pii` is disabled in Sentry configuration
- User IDs are tracked, but emails and names are redacted
- Request cookies are removed from error context
- Form data with sensitive fields is sanitized

## Error Response Format

All API errors follow a consistent format:

```json
{
  "detail": "User-friendly error message",
  "error_code": "SPECIFIC_ERROR_CODE",  // Optional
  "request_id": "uuid-for-tracking"     // Optional
}
```

## Monitoring Dashboard

### Key Metrics to Track

1. **Error Rate**: Monitor overall error rate and error types
2. **Performance**: P95 response times for critical endpoints
3. **User Impact**: Number of users affected by errors
4. **AI Service Health**: Success rate of AI API calls
5. **Database Performance**: Slow query tracking

### Alerts to Configure

1. **High Error Rate**: > 5% error rate over 5 minutes
2. **Performance Degradation**: P95 > 2 seconds
3. **AI Service Failures**: > 10 failures in 5 minutes
4. **Authentication Failures**: Spike in failed logins
5. **Rate Limit Violations**: Unusual activity patterns

## Development vs Production

### Development Mode
- Detailed error messages in responses
- Console logging enabled
- Stack traces visible in UI
- All transactions sampled

### Production Mode
- Generic error messages to users
- JSON structured logging
- No stack traces in responses
- 10% transaction sampling

## Testing Error Handling

### Backend Testing

```python
# Test error handling
async def test_ai_service_error_tracking(client, mocker):
    # Mock AI service to fail
    mocker.patch(
        "app.services.socratic_ai.generate_questions",
        side_effect=AIServiceError("Service unavailable")
    )

    response = await client.post("/api/ai/ask", json={...})
    assert response.status_code == 503
    assert "internal error" in response.json()["detail"]
```

### Frontend Testing

```typescript
// Test error boundary
it('catches and displays errors gracefully', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});
```

## Troubleshooting

### Common Issues

1. **Sentry not receiving events**
   - Check SENTRY_DSN is set correctly
   - Verify ENABLE_SENTRY is true
   - Check network connectivity
   - Verify Sentry project is active

2. **Missing user context**
   - Ensure setUserContext is called on login
   - Verify user ID is available
   - Check error filtering isn't too aggressive

3. **Performance data missing**
   - Verify traces_sample_rate > 0
   - Check transaction names are set
   - Ensure integrations are enabled

4. **Sensitive data in errors**
   - Review before_send filters
   - Check custom error messages
   - Audit breadcrumb data

## Best Practices

1. **Use structured logging** for all important events
2. **Track user actions** that lead to errors
3. **Add context** to errors for easier debugging
4. **Monitor performance** of critical paths
5. **Test error scenarios** in development
6. **Review Sentry issues** regularly
7. **Update filters** as new sensitive data is identified
8. **Document new error types** as they're added

---

Remember: Good error monitoring helps us understand user pain points and improve the application continuously.
