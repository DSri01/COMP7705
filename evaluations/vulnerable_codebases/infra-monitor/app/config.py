from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    environment: str = "development"
    redis_url: str = "redis://localhost:6379/0"
    internal_services: str = ""
    check_interval: int = 60
    alert_webhook_url: str = ""

    model_config = {"env_file": ".env"}


settings = Settings()
