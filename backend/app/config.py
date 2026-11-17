import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "VoteChain - Secure Blockchain Voting System"
    API_V1_STR: str = "/api/v1"
    
    # Database URL: Supports PostgreSQL (primary) or SQLite (for local dev/tests)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./votechain.db"
    )
    
    # JWT Authentication
    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY", 
        "votechain-super-secret-jwt-key-minimum-32-chars-long"
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours for prototype demo
    
    # Master key for AES-256-GCM election key derivation (32 bytes)
    MASTER_ENCRYPTION_KEY: str = os.getenv(
        "MASTER_ENCRYPTION_KEY",
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    )
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()
