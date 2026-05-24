import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Explicitly load .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/postgres"
    GROQ_API_KEY: str = "gsk_your_groq_api_key_here"
    GEMINI_API_KEY: str = "your_gemini_api_key_here"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
