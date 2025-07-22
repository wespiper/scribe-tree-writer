"""Simple caching utilities for performance optimization"""

from datetime import datetime, timedelta
from functools import wraps
from typing import Any, Callable, Optional


class SimpleCache:
    """Simple in-memory cache with TTL support"""

    def __init__(self) -> None:
        self._cache: dict[str, dict[str, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        if key in self._cache:
            entry = self._cache[key]
            if datetime.utcnow() < entry["expires_at"]:
                return entry["value"]
            else:
                # Clean up expired entry
                del self._cache[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        """Set value in cache with TTL"""
        self._cache[key] = {
            "value": value,
            "expires_at": datetime.utcnow() + timedelta(seconds=ttl_seconds),
        }

    def clear(self) -> None:
        """Clear all cache entries"""
        self._cache.clear()

    def clear_pattern(self, pattern: str) -> None:
        """Clear cache entries matching pattern"""
        keys_to_delete = [k for k in self._cache.keys() if pattern in k]
        for key in keys_to_delete:
            del self._cache[key]


# Global cache instance
cache = SimpleCache()


def cache_response(ttl_seconds: int = 300):
    """Decorator to cache FastAPI endpoint responses"""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key from function name and arguments
            cache_key_parts = [func.__name__]

            # Extract user ID if available
            if "current_user" in kwargs and kwargs["current_user"] is not None:
                cache_key_parts.append(f"user:{kwargs['current_user'].id}")

            # Add relevant kwargs to cache key (exclude db session, response, etc.)
            for k, v in sorted(kwargs.items()):
                if k not in ["db", "current_user", "response"] and v is not None:
                    cache_key_parts.append(f"{k}:{str(v)}")

            cache_key = ":".join(cache_key_parts)

            # Check cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                # Add cache status header
                if "response" in kwargs:
                    kwargs["response"].headers["X-Cache-Status"] = "HIT"
                return cached_value

            # Call function
            result = await func(*args, **kwargs)

            # Cache result
            cache.set(cache_key, result, ttl_seconds)

            # Add cache status header
            if "response" in kwargs:
                kwargs["response"].headers["X-Cache-Status"] = "MISS"

            return result

        return wrapper

    return decorator


def invalidate_user_cache(user_id: str) -> None:
    """Invalidate all cache entries for a specific user"""
    cache.clear_pattern(f"user:{user_id}")
