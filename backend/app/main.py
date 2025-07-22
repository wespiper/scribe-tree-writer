from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from starlette.middleware.gzip import GZipMiddleware

from app.api import ai_partner, analytics, auth, documents
from app.core.config import settings
from app.core.database import Base, engine
from app.core.monitoring import logger
from app.core.security_middleware import (
    RequestSizeLimitMiddleware,
    SecurityHeadersMiddleware,
    custom_rate_limit_handler,
    limiter,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Scribe Tree Writer API", environment=settings.ENVIRONMENT)

    # Initialize database
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error("Failed to initialize database", error=str(e))
        raise

    yield

    # Shutdown
    logger.info("Shutting down Scribe Tree Writer API")
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="AI writing partner that enhances thinking through Socratic questioning",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)

# Security middleware (order matters - these run in reverse order)
# 1. GZip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 2. Security headers
app.add_middleware(SecurityHeadersMiddleware)

# 3. Request size limit (10MB)
app.add_middleware(RequestSizeLimitMiddleware, max_size=10 * 1024 * 1024)

# 4. Trusted host (prevents host header attacks)
if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=(
            settings.ALLOWED_HOSTS.split(",")
            if hasattr(settings, "ALLOWED_HOSTS")
            else ["*"]
        ),
    )

# 5. CORS (should be last to run first)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600,
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(ai_partner.router, prefix="/api/ai", tags=["ai"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])


@app.get("/")
async def root():
    return {
        "message": "Welcome to Scribe Tree Writer API",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {"status": "healthy", "service": "backend", "version": "0.1.0"}


@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check including database connectivity"""
    health_status = {
        "status": "healthy",
        "service": "backend",
        "version": "0.1.0",
        "checks": {
            "database": "unknown",
            "redis": "unknown",
        },
    }

    # Check database
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        health_status["checks"]["database"] = "healthy"
    except Exception:
        health_status["checks"]["database"] = "unhealthy"
        health_status["status"] = "degraded"

    # Redis check will be added when cache service is implemented

    return health_status


# Custom exception handler for unhandled errors
@app.exception_handler(Exception)
async def custom_exception_handler(request: Request, exc: Exception):
    """Log unhandled exceptions to Sentry and return generic error"""
    import traceback

    from fastapi.responses import JSONResponse

    # Log to structured logger
    logger.error(
        "Unhandled exception",
        error=str(exc),
        error_type=type(exc).__name__,
        path=request.url.path,
        method=request.method,
        traceback=traceback.format_exc(),
    )

    # Return generic error to client
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred. Please try again later."
        },
    )
