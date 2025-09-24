from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path


class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "SignVerse API"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "SignVerse Backend API"

    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 5001

    # Security Settings
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"

    # Database Settings
    DATABASE_URL: Optional[str] = None
    POSTGRES_SERVER: Optional[str] = None
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None

    # Redis Settings
    REDIS_URL: Optional[str] = None

    # CORS Settings
    BACKEND_CORS_ORIGINS: list[str] = [
        "https://localhost:9002", "http://localhost:9002",
        "https://localhost:3000", "http://localhost:3000", 
        "http://localhost:8080",
        "https://127.0.0.1:9002", "http://127.0.0.1:9002",
        "https://192.168.1.8:3000", "https://192.168.1.8:9002",
        "http://192.168.1.8:3000", "http://192.168.1.8:5001",
        "https://0.0.0.0:9002", "http://0.0.0.0:9002",
        "https://192.168.1.8:5001", "https://0.0.0.0:5001"
    ]

    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # Credential Paths
    CREDENTIALS_DIR: str = "credentials"
    SECRETS_DIR: str = "credentials/secrets"

    # API Keys (loaded from environment or credential files)
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None

    # GCP Settings
    GCP_PROJECT_ID: Optional[str] = None
    GCP_CREDENTIALS_FILE: Optional[str] = None
    GCP_SERVICE_ACCOUNT_KEY: Optional[str] = None
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None

    # Other API Keys
    STRIPE_SECRET_KEY: Optional[str] = None
    SENDGRID_API_KEY: Optional[str] = None
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
