import os
import secrets
import tempfile
from typing import Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

INSECURE_COMMITTED_SECRET = "sql-quest-neon-production-secret-key-2025"


def get_secure_secret_key() -> str:
    """
    Returns the environment SECRET_KEY if provided and not the compromised repository default.
    Otherwise, securely provisions a random high-entropy token persisted to local temp storage
    so tokens remain valid within an active container runtime while preventing token forgery.
    """
    env_key = os.getenv("SECRET_KEY", "").strip()
    if env_key and env_key != INSECURE_COMMITTED_SECRET:
        return env_key

    secret_file = os.path.join(tempfile.gettempdir(), ".sqlquest_session_jwt_key")
    try:
        if os.path.exists(secret_file):
            with open(secret_file, "r", encoding="utf-8") as f:
                cached = f.read().strip()
                if cached:
                    return cached
        new_secret = secrets.token_urlsafe(48)
        with open(secret_file, "w", encoding="utf-8") as f:
            f.write(new_secret)
        return new_secret
    except Exception:
        return secrets.token_urlsafe(48)


class Settings(BaseSettings):
    PROJECT_NAME: str = "SQL Quest API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Security & Auth: Dynamically secured to eliminate token forgery vulnerabilities
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    @field_validator("SECRET_KEY", mode="after")
    @classmethod
    def validate_and_secure_secret_key(cls, val: str) -> str:
        if not val or val.strip() == INSECURE_COMMITTED_SECRET:
            return get_secure_secret_key()
        return val.strip()

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
