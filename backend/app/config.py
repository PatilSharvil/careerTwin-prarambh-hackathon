import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from app.schemas import Provider

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    LLM_PROVIDER_CHAIN: str = "groq,openrouter,gemini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "qwen/qwen3.8-27b"
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "meta-llama/llama-3.3-70b-instruct:free"
    LLM_TIMEOUT_SECONDS: int = 45
    CHROMA_PATH: str = "./chroma_data"
    DATABASE_PATH: str = "./careertwin.db"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    DEFAULT_USER_ID: str = "demo"

    def provider_chain(self) -> list[Provider]:
        raw_chain = [p.strip().lower() for p in self.LLM_PROVIDER_CHAIN.split(",") if p.strip()]
        if "none" in raw_chain or not raw_chain:
            return []
        
        valid: list[Provider] = []
        for p in raw_chain:
            if p == "gemini":
                if self.GEMINI_API_KEY.strip():
                    valid.append("gemini")
            elif p == "groq":
                if self.GROQ_API_KEY.strip():
                    valid.append("groq")
            elif p == "openrouter":
                if self.OPENROUTER_API_KEY.strip():
                    valid.append("openrouter")
        return valid

settings = Settings()

# Sync environment variables needed by Google ADK and LiteLLM
if settings.GEMINI_API_KEY.strip():
    os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY.strip()
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "FALSE"

if settings.GROQ_API_KEY.strip():
    os.environ["GROQ_API_KEY"] = settings.GROQ_API_KEY.strip()
if settings.OPENROUTER_API_KEY.strip():
    os.environ["OPENROUTER_API_KEY"] = settings.OPENROUTER_API_KEY.strip()
