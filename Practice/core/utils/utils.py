from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


class Settings(BaseSettings):
    # ---------------------------------------------------------
    # Application
    # ---------------------------------------------------------

    APP_NAME: str = "Agentic Commerce API"
    APP_ENV: str = "development"


    # ---------------------------------------------------------
    # Database
    # ---------------------------------------------------------

    DATABASE_URL: str


    # ---------------------------------------------------------
    # JWT
    # ---------------------------------------------------------

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7


    # ---------------------------------------------------------
    # Merchant configuration
    # ---------------------------------------------------------

    AUTO_APPROVE_MERCHANTS: bool = True


    # ---------------------------------------------------------
    # Admin
    # ---------------------------------------------------------

    ADMIN_NAME: str = "Platform Admin"

    ADMIN_EMAIL: str = (
        "admin@agenticcommerce.local"
    )

    ADMIN_PASSWORD: str = (
        "AdminPass123!@#"
    )


    # ---------------------------------------------------------
    # Razorpay
    # ---------------------------------------------------------

    RAZORPAY_KEY_ID: str = ""

    RAZORPAY_KEY_SECRET: str = ""

    RAZORPAY_WEBHOOK_SECRET: str = ""


    # ---------------------------------------------------------
    # Ollama
    # ---------------------------------------------------------

    OLLAMA_BASE_URL: str = (
        "http://127.0.0.1:11434"
    )

    OLLAMA_MODEL: str = (
        "llama3.2:3b"
    )

    OLLAMA_EMBED_MODEL: str = (
        "nomic-embed-text"
    )


    # ---------------------------------------------------------
    # Configuration
    # ---------------------------------------------------------

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()


def normalize_email(
    email: str,
) -> str:
    return email.strip().lower()