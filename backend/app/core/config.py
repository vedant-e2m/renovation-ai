from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "House Renovation API"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    SESSION_TTL_HOURS: int = 24

    # OpenRouter
    OPENROUTER_API_KEY: str
    OPENROUTER_DETECTION_MODEL: str = "google/gemini-3.1-flash-lite"
    OPENROUTER_MODEL: str = "google/gemini-2.5-flash-preview-image"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1/chat/completions"

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # File upload
    MAX_UPLOAD_SIZE_MB: int = 20
    ALLOWED_IMAGE_TYPES: list[str] = ["image/jpeg", "image/png", "image/webp"]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()