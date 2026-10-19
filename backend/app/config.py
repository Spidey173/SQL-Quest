import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Settings(BaseSettings):
    PROJECT_NAME: str = "SQL Quest API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Security & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "sql-quest-neon-production-secret-key-2025")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database: Loaded securely from environment (.env), falls back to local SQLite if unset
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./sqlquest_local.db"
    )

    # Redis (Optional)
    REDIS_URL: Optional[str] = None

    # Execution Sandbox Constraints
    SANDBOX_TIMEOUT_SECONDS: float = 3.0
    SANDBOX_MAX_OUTPUT_BYTES: int = 65536  # 64KB
    SANDBOX_MAX_MEMORY_MB: int = 128

    model_config = SettingsConfigDict(
        env_file=os.path.join(BASE_DIR, ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
