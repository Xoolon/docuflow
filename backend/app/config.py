from functools import lru_cache
from pathlib import Path
from dotenv import load_dotenv

# Explicitly load .env from the backend folder
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App
    app_name: str = "DocuFlow"
    app_env: str = "development"
    secret_key: str = "change-this-secret-key-min-32-chars-long"
    frontend_url: str = "http://localhost:5173"

    # Database
    database_url: str = "sqlite:///./docuflow.db"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""

    # Apple Sign-In (optional)
    apple_client_id: str = ""
    apple_team_id: str = ""
    apple_key_id: str = ""
    apple_private_key: str = ""

    # Anthropic API
    anthropic_api_key: str = ""

    # Paystack
    paystack_secret_key: str = ""
    paystack_public_key: str = ""
    paystack_currency: str = ""

    # S3-compatible Storage
    s3_endpoint_url: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_bucket_name: str = "docuflow-files"
    s3_region: str = "auto"

    # Usage limits
    free_conversions_per_day: int = 5
    free_ai_generations_per_day: int = 1
    free_ai_max_input_tokens: int = 500
    paid_ai_max_input_tokens: int = 2000
    file_max_size_mb: int = 25

    # JWT
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    model_config = {
        "case_sensitive": False,
        "extra": "ignore"
        # env_file not needed because we loaded manually
    }

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()