"""
Monitoring and error tracking configuration using Sentry and structured logging.
"""

import asyncio
import logging
import sys
from typing import Any, Optional

import sentry_sdk
import structlog
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from app.core.config import settings


def setup_sentry() -> None:
    """Initialize Sentry error tracking."""
    if not settings.ENABLE_SENTRY or not settings.SENTRY_DSN:
        logging.info("Sentry is disabled or DSN not provided")
        return

    # Sentry logging integration
    sentry_logging = LoggingIntegration(
        level=logging.INFO,  # Capture info and above as breadcrumbs
        event_level=logging.ERROR,  # Send errors as events
    )

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT or settings.ENVIRONMENT,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
            sentry_logging,
        ],
        # Additional options
        attach_stacktrace=True,
        send_default_pii=False,  # Don't send personally identifiable information
        before_send=before_send_filter,
        before_send_transaction=before_send_transaction_filter,
        # Release tracking
        release=(
            f"scribe-tree-writer@{settings.APP_VERSION}"
            if hasattr(settings, "APP_VERSION")
            else None
        ),
    )

    logging.info(f"Sentry initialized for environment: {settings.ENVIRONMENT}")


def before_send_filter(
    event: dict[str, Any], hint: dict[str, Any]
) -> Optional[dict[str, Any]]:
    """
    Filter events before sending to Sentry.
    Can be used to:
    - Remove sensitive data
    - Filter out certain errors
    - Add additional context
    """
    # Filter out certain errors
    if "exc_info" in hint:
        exc_type, exc_value, tb = hint["exc_info"]

        # Don't send client errors (4xx)
        if hasattr(exc_value, "status_code") and 400 <= exc_value.status_code < 500:
            return None

    # Remove sensitive data from request
    if "request" in event and "data" in event["request"]:
        data = event["request"]["data"]
        if isinstance(data, dict):
            # Remove password fields
            for key in ["password", "token", "secret", "api_key"]:
                if key in data:
                    data[key] = "[REDACTED]"

    # Add custom context
    if "user" in event and event["user"]:
        # Remove email to protect privacy
        if "email" in event["user"]:
            event["user"]["email"] = "[REDACTED]"

    return event


def before_send_transaction_filter(
    event: dict[str, Any], hint: dict[str, Any]
) -> Optional[dict[str, Any]]:
    """
    Filter performance transactions before sending to Sentry.
    """
    # Don't track health check endpoints
    if event.get("transaction") in ["/health", "/health/detailed"]:
        return None

    return event


def setup_structured_logging() -> None:
    """
    Configure structured logging using structlog.
    """
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.CallsiteParameterAdder(
                parameters=[
                    structlog.processors.CallsiteParameter.FILENAME,
                    structlog.processors.CallsiteParameter.LINENO,
                    structlog.processors.CallsiteParameter.FUNC_NAME,
                ]
            ),
            structlog.processors.dict_tracebacks,
            (
                structlog.processors.JSONRenderer()
                if settings.ENVIRONMENT == "production"
                else structlog.dev.ConsoleRenderer(colors=True)
            ),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Set up Python logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.DEBUG if settings.DEBUG else logging.INFO,
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """
    Get a structured logger instance.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Structured logger instance
    """
    return structlog.get_logger(name)


# Custom error classes that should be tracked
class BusinessLogicError(Exception):
    """Base class for business logic errors that should be tracked."""

    pass


class AIServiceError(BusinessLogicError):
    """Error when AI service fails."""

    pass


class ReflectionQualityError(BusinessLogicError):
    """Error when reflection doesn't meet quality standards."""

    pass


class DocumentAccessError(BusinessLogicError):
    """Error when user tries to access unauthorized document."""

    pass


def track_custom_error(
    error: Exception, context: Optional[dict[str, Any]] = None
) -> None:
    """
    Track custom errors in Sentry with additional context.

    Args:
        error: The exception to track
        context: Additional context to send with the error
    """
    with sentry_sdk.push_scope() as scope:
        if context:
            for key, value in context.items():
                scope.set_extra(key, value)

        # Set error level based on error type
        if isinstance(error, BusinessLogicError):
            scope.level = "error"
        else:
            scope.level = "warning"

        sentry_sdk.capture_exception(error)


def track_user_action(
    action: str, user_id: str, metadata: Optional[dict[str, Any]] = None
) -> None:
    """
    Track important user actions as breadcrumbs.

    Args:
        action: Action name (e.g., "reflection_submitted", "ai_question_asked")
        user_id: User ID performing the action
        metadata: Additional metadata about the action
    """
    sentry_sdk.add_breadcrumb(
        category="user_action",
        message=action,
        level="info",
        data={"user_id": user_id, **(metadata or {})},
    )


def measure_performance(transaction_name: str, op: str = "function"):
    """
    Decorator to measure performance of functions.

    Args:
        transaction_name: Name for the transaction
        op: Operation type (e.g., "db", "http", "function")
    """

    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            with sentry_sdk.start_transaction(
                op=op, name=transaction_name
            ) as transaction:
                with transaction.start_child(
                    op=f"{op}.execute", description=func.__name__
                ):
                    return await func(*args, **kwargs)

        def sync_wrapper(*args, **kwargs):
            with sentry_sdk.start_transaction(
                op=op, name=transaction_name
            ) as transaction:
                with transaction.start_child(
                    op=f"{op}.execute", description=func.__name__
                ):
                    return func(*args, **kwargs)

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


# Initialize monitoring on module import
setup_structured_logging()
setup_sentry()

# Export logger for use in other modules
logger = get_logger(__name__)
