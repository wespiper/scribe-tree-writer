"""
Security middleware for the application including rate limiting,
security headers, and request validation.
"""

from typing import Callable

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address


def get_real_client_ip(request: Request) -> str:
    """
    Get the real client IP address, considering proxy headers.
    """
    # Check X-Forwarded-For header first (for proxied requests)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs, get the first one
        return forwarded_for.split(",")[0].strip()

    # Check X-Real-IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    # Fall back to direct client IP
    return get_remote_address(request)


# Create rate limiter with custom key function
limiter = Limiter(key_func=get_real_client_ip)


# Custom rate limit exceeded handler
async def custom_rate_limit_handler(
    request: Request, exc: RateLimitExceeded
) -> Response:
    """
    Custom handler for rate limit exceeded errors.
    """
    response = JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "detail": f"Rate limit exceeded: {exc.detail}",
            "retry_after": request.state.view_rate_limit,
        },
    )
    response.headers["Retry-After"] = str(request.state.view_rate_limit)
    return response


class SecurityHeadersMiddleware:
    """
    Middleware to add security headers to all responses.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = dict(message.get("headers", []))

                # Security headers
                security_headers = [
                    (b"x-content-type-options", b"nosniff"),
                    (b"x-frame-options", b"DENY"),
                    (b"x-xss-protection", b"1; mode=block"),
                    (b"referrer-policy", b"strict-origin-when-cross-origin"),
                    (
                        b"permissions-policy",
                        b"geolocation=(), microphone=(), camera=()",
                    ),
                    (
                        b"content-security-policy",
                        b"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                        b"style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; "
                        b"font-src 'self' data:; connect-src 'self' https://api.openai.com https://api.anthropic.com;",
                    ),
                ]

                # Add headers if not already present
                for header, value in security_headers:
                    if header not in [h[0].lower() for h in headers.items()]:
                        message["headers"].append((header, value))

            await send(message)

        await self.app(scope, receive, send_with_headers)


class RequestSizeLimitMiddleware:
    """
    Middleware to limit request body size.
    """

    def __init__(self, app, max_size: int = 10 * 1024 * 1024):  # 10MB default
        self.app = app
        self.max_size = max_size

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Check content-length header
        headers = dict(scope.get("headers", []))
        content_length = headers.get(b"content-length")

        if content_length:
            try:
                size = int(content_length)
                if size > self.max_size:
                    response = JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={
                            "detail": f"Request body too large. Maximum size: {self.max_size} bytes"
                        },
                    )
                    await response(scope, receive, send)
                    return
            except ValueError:
                pass

        await self.app(scope, receive, send)


# Rate limiting decorators for different endpoints
rate_limit_auth = limiter.limit("5/minute")  # Strict for auth endpoints
rate_limit_ai = limiter.limit("30/minute")  # Moderate for AI endpoints
rate_limit_general = limiter.limit("60/minute")  # General API endpoints
rate_limit_analytics = limiter.limit("100/minute")  # Higher for analytics


# IP-based rate limiting for sensitive operations
def get_ip_rate_limit(limit: str) -> Callable:
    """
    Create an IP-based rate limiter with the specified limit.
    """
    return limiter.limit(limit, key_func=get_real_client_ip)
