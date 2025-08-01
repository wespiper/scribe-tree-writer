from typing import Any, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Scribe Tree Writer"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # AI Services
    OPENAI_API_KEY: str
    ANTHROPIC_API_KEY: str

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Redis (optional)
    REDIS_URL: str = "redis://localhost:6379/0"

    # Environment
    ENVIRONMENT: str = "development"

    # Security Settings
    ALLOWED_HOSTS: str = "*"
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 600
    MAX_UPLOAD_SIZE_MB: int = 10
    SESSION_EXPIRE_MINUTES: int = 10080  # 7 days

    # File Upload
    ALLOWED_UPLOAD_EXTENSIONS: list[str] = [".txt", ".md", ".doc", ".docx", ".pdf"]

    # Monitoring
    SENTRY_DSN: Optional[str] = None
    SENTRY_ENVIRONMENT: Optional[str] = None
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1  # 10% of transactions
    ENABLE_SENTRY: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Allow extra fields in environment

        @classmethod
        def parse_env_var(cls, field_name: str, raw_val: str) -> Any:
            if field_name == "ALLOWED_ORIGINS":
                return [origin.strip() for origin in raw_val.split(",")]
            return raw_val


settings = Settings()  # type: ignore[call-arg]
