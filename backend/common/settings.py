from pydantic import BaseSettings, AnyUrl, Field
from typing import Optional


class Settings(BaseSettings):
    database_url: Optional[AnyUrl] = Field(None, env="DATABASE_URL")
    mongodb_uri: Optional[str] = Field(None, env="MONGODB_URI")
    jwt_secret_key: Optional[str] = Field(None, env="JWT_SECRET_KEY")
    jwt_algorithm: str = Field("HS256", env="JWT_ALGORITHM")
    encryption_master_key: Optional[str] = Field(None, env="ENCRYPTION_MASTER_KEY")
    allowed_origins: Optional[str] = Field(None, env="ALLOWED_ORIGINS")
    notification_service_url: str = Field("http://notification-service:8000", env="NOTIFICATION_SERVICE_URL")

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()  # noqa: E305


