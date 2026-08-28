from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Anchor paths to this file's location so the app behaves identically no matter
# what working directory it's launched from (previously the SQLite file landed
# in a different place depending on CWD).
BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    app_name: str = "AI Revenue Recovery Engine"
    database_url: str = f"sqlite:///{BACKEND_DIR / 'recovery_engine.db'}"

    # Comma-separated list of origins allowed by CORS. Wildcard is intentionally
    # avoided because it is invalid together with credentialed requests.
    cors_origins: str = "http://localhost:3000"

    # Fernet key for encrypting PII at rest. Empty -> ephemeral dev key.
    encryption_key: str = ""

    # Razorpay Settings
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""

    # Gemini (cognitive layer). Model is overridable so the deployment can track
    # whichever Flash model the API key has access to.
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"

    # When false, channel adapters simulate dispatch instead of making real
    # outbound calls. Kept off by default so the batch harness never spams.
    live_mode: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
