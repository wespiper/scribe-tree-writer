# Security Implementation Guide

## Overview

This document outlines the security measures implemented in Scribe Tree Writer to protect user data and prevent common web vulnerabilities.

## Security Features

### 1. Rate Limiting

Rate limiting is implemented using SlowAPI to prevent abuse and DDoS attacks.

**Configuration:**
- Authentication endpoints: 5 requests/minute
- AI endpoints: 30 requests/minute
- General API endpoints: 60 requests/minute
- Analytics endpoints: 100 requests/minute

**Implementation:**
```python
from app.core.security_middleware import rate_limit_auth, rate_limit_ai

@router.post("/login", dependencies=[Depends(rate_limit_auth)])
async def login(...):
    # Rate limited to 5/minute
```

### 2. Input Validation

All user inputs are validated using Pydantic models with strict validation rules.

**Features:**
- Length limits on all text fields
- Email format validation
- Password strength requirements
- XSS prevention through HTML escaping
- SQL injection prevention through parameterized queries

**Example:**
```python
class UserCreate(BaseModel):
    email: EmailStr
    password: str

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        # Additional checks...
```

### 3. Security Headers

Security headers are automatically added to all responses:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- `Content-Security-Policy: [restrictive policy]`

### 4. CORS Configuration

Cross-Origin Resource Sharing is strictly configured:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  # Explicitly listed origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600,
)
```

### 5. Request Size Limits

- Maximum request body size: 10MB
- Prevents memory exhaustion attacks
- Configurable per endpoint if needed

### 6. Authentication & Authorization

- JWT tokens with configurable expiration
- Bcrypt password hashing
- Token validation on every protected endpoint
- User ownership verification for resources

### 7. Environment-Specific Security

**Development:**
- API documentation enabled
- Debug mode for easier troubleshooting
- Relaxed CORS for local development

**Production:**
- API documentation disabled
- Trusted host validation
- Strict CORS policy
- Enhanced logging

## Security Best Practices

### Password Requirements

Enforced password policy:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (recommended)

### Data Sanitization

All user inputs are sanitized:
```python
from app.utils.security_utils import sanitize_text_input

def sanitize_text_input(text: str, max_length: int = 10000) -> str:
    # Strip whitespace
    # Remove null bytes
    # Remove control characters
    # Enforce length limits
```

### File Upload Security

- Whitelist allowed file extensions
- Sanitize filenames
- Validate file content types
- Size limits enforced

### SQL Injection Prevention

- All queries use SQLAlchemy ORM
- Parameterized queries for raw SQL
- Input validation before database operations

### XSS Prevention

- HTML escaping for all user content
- Content Security Policy headers
- React's built-in XSS protection

## Security Monitoring

### Logging

Security events are logged:
- Failed authentication attempts
- Rate limit violations
- Invalid input attempts
- Unauthorized access attempts

### Error Handling

- Generic error messages to users
- Detailed errors only in logs
- No sensitive data in error responses

## Security Checklist for Developers

Before deploying new features:

- [ ] All inputs validated with Pydantic models
- [ ] Rate limiting applied to new endpoints
- [ ] Authentication required for sensitive operations
- [ ] User ownership verified for resource access
- [ ] No sensitive data in logs or error messages
- [ ] SQL queries use ORM or parameterized queries
- [ ] File uploads validate extension and content
- [ ] CORS not overly permissive
- [ ] Security headers not overridden
- [ ] Tests include security scenarios

## Incident Response

If a security issue is discovered:

1. **Assess** - Determine scope and impact
2. **Contain** - Disable affected features if necessary
3. **Fix** - Implement and test the fix
4. **Deploy** - Roll out fix with minimal downtime
5. **Review** - Post-mortem to prevent recurrence

## Regular Security Tasks

### Weekly
- Review rate limit logs for anomalies
- Check for failed authentication patterns
- Monitor error logs for security issues

### Monthly
- Update dependencies for security patches
- Review user access patterns
- Audit new code for security issues

### Quarterly
- Full security audit
- Penetration testing (if applicable)
- Update security documentation

## API Security

### Endpoint Protection

All endpoints follow this pattern:
```python
@router.post(
    "/endpoint",
    dependencies=[Depends(rate_limit_appropriate)],  # Rate limiting
    response_model=ResponseModel,  # Output validation
)
async def endpoint(
    request: Request,
    data: ValidatedInput,  # Input validation
    current_user: User = Depends(get_current_user),  # Authentication
    db: AsyncSession = Depends(get_db),
):
    # Verify user owns resource
    # Perform operation
    # Return sanitized response
```

### API Key Management

For future API key implementation:
- Keys stored hashed, not plaintext
- Automatic expiration
- Rotation reminders
- Usage tracking
- Scope limitations

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [Python Security](https://python.readthedocs.io/en/latest/library/secrets.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

Remember: Security is everyone's responsibility. When in doubt, ask for a security review!
