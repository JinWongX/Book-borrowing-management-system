import os
import sys

# 将 backend 目录加入 sys.path，使后端模块的无前缀绝对导入可用
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BACKEND_DIR)

# 在导入后端配置前设置内存数据库，避免污染生产 SQLite
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

# 测试使用固定密钥与初始密码，确保测试可重复且不受环境变量影响
os.environ.setdefault("SECRET_KEY", "test-secret-key-at-least-32-characters-long")
os.environ.setdefault("INITIAL_PASSWORD_EMPLOYEE", "123456")
os.environ.setdefault("INITIAL_PASSWORD_LIBRARIAN", "123456")
os.environ.setdefault("INITIAL_PASSWORD_ADMIN", "123456")
os.environ.setdefault("DEBUG", "False")

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

import main
import database
from init_db import init_roles, init_users, init_categories, init_books
from models import Base

# 禁用启动时的后台定时任务线程，避免测试期间产生不确定的副作用
main.start_scheduler = lambda **kwargs: None


def _seed_database(db):
    """初始化测试所需的默认角色、用户、分类与图书数据。"""
    roles = init_roles(db)
    init_users(db, roles)
    init_categories(db)
    init_books(db)


@pytest.fixture(scope="function")
def client():
    """每个测试函数使用独立的内存数据库与 TestClient。"""
    # 使用 StaticPool 保证 :memory: 数据库在多个线程/连接间共享
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    database.engine = engine
    database.SessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=engine
    )
    Base.metadata.create_all(bind=engine)

    db = database.SessionLocal()
    try:
        _seed_database(db)
    finally:
        db.close()

    with TestClient(main.app) as c:
        yield c

    engine.dispose()
