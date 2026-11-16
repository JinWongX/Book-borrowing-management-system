import logging
import os
import secrets
from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings

# 显式加载 backend/.env，确保在 Settings 实例化前环境变量已就绪
_ENV_FILE = Path(__file__).resolve().parent / ".env"
load_dotenv(_ENV_FILE)

logger = logging.getLogger(__name__)


def _generate_secret_key() -> str:
    """生成强随机 JWT 签名密钥（>= 256 bit）。"""
    return secrets.token_urlsafe(32)


class Settings(BaseSettings):
    PROJECT_NAME: str = "Enterprise Book Borrowing System"
    VERSION: str = "0.1.0"
    API_PREFIX: str = "/api"
    DEBUG: bool = False

    DATABASE_URL: str = "sqlite:///./database.sqlite"
    SECRET_KEY: str = Field(default_factory=_generate_secret_key)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # CORS 允许来源，逗号分隔；开发环境同时支持 localhost 与 127.0.0.1
    # 生产环境应仅保留实际前端域名
    ALLOW_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()

if not os.getenv("SECRET_KEY"):
    logger.warning(
        "SECRET_KEY is not set in environment/.env. "
        "A random key has been generated for this process, "
        "but it will change on every restart. "
        "Please set a persistent SECRET_KEY for production."
    )
