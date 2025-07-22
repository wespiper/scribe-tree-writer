"""
Security utilities for input validation and sanitization.
"""

import html
import re
from typing import Optional
from urllib.parse import urlparse


def sanitize_html(text: str) -> str:
    """
    Basic HTML sanitization to prevent XSS attacks.
    Escapes HTML entities.
    """
    return html.escape(text)


def validate_email(email: str) -> bool:
    """
    Validate email format using regex.
    """
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))


def validate_url(url: str, allowed_schemes: Optional[list[str]] = None) -> bool:
    """
    Validate URL format and scheme.
    """
    if allowed_schemes is None:
        allowed_schemes = ["http", "https"]

    try:
        parsed = urlparse(url)
        return parsed.scheme in allowed_schemes and bool(parsed.netloc)
    except Exception:
        return False


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent directory traversal attacks.
    """
    # Remove any path components
    filename = filename.replace("..", "").replace("/", "").replace("\\", "")

    # Allow only alphanumeric, dash, underscore, and dot
    filename = re.sub(r"[^a-zA-Z0-9._-]", "", filename)

    # Limit length
    max_length = 255
    if len(filename) > max_length:
        name, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")
        filename = f"{name[:max_length-len(ext)-1]}.{ext}" if ext else name[:max_length]

    return filename


def validate_file_extension(filename: str, allowed_extensions: list[str]) -> bool:
    """
    Validate file extension against allowed list.
    """
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    return f".{ext}" in [e.lower() for e in allowed_extensions]


def sanitize_text_input(text: str, max_length: int = 10000) -> str:
    """
    Sanitize general text input.
    """
    # Strip whitespace
    text = text.strip()

    # Limit length
    text = text[:max_length]

    # Remove null bytes
    text = text.replace("\x00", "")

    # Remove control characters except newlines and tabs
    text = "".join(
        char for char in text if char == "\n" or char == "\t" or (ord(char) >= 32)
    )

    return text


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password meets security requirements.
    Returns (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if not any(char.isdigit() for char in password):
        return False, "Password must contain at least one number"

    if not any(char.isupper() for char in password):
        return False, "Password must contain at least one uppercase letter"

    if not any(char.islower() for char in password):
        return False, "Password must contain at least one lowercase letter"

    if not any(char in "!@#$%^&*()_+-=[]{}|;:,.<>?" for char in password):
        return False, "Password must contain at least one special character"

    # Check for common patterns
    common_patterns = ["password", "12345", "qwerty", "admin", "letmein"]
    if any(pattern in password.lower() for pattern in common_patterns):
        return False, "Password contains common patterns"

    return True, None


def sanitize_sql_identifier(identifier: str) -> str:
    """
    Sanitize SQL identifiers (table names, column names).
    Only allow alphanumeric and underscore.
    """
    return re.sub(r"[^a-zA-Z0-9_]", "", identifier)


def validate_uuid(uuid_string: str) -> bool:
    """
    Validate UUID format.
    """
    uuid_pattern = re.compile(
        r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
        re.IGNORECASE,
    )
    return bool(uuid_pattern.match(uuid_string))


def rate_limit_key(user_id: str, action: str) -> str:
    """
    Generate a rate limit key for Redis.
    """
    return f"rate_limit:{user_id}:{action}"


def mask_sensitive_data(data: str, visible_chars: int = 4) -> str:
    """
    Mask sensitive data like API keys, showing only first few characters.
    """
    if len(data) <= visible_chars * 2:
        return "*" * len(data)

    return (
        data[:visible_chars]
        + "*" * (len(data) - visible_chars * 2)
        + data[-visible_chars:]
    )
