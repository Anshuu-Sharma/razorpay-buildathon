from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "AI Revenue Recovery Engine"
    database_url: str = "sqlite:///./recovery_engine.db"
    
    # Razorpay Settings
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
