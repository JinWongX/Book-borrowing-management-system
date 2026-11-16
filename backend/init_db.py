import os
import secrets
import sys

from sqlalchemy import text
from sqlalchemy.orm import Session

from database import engine, Base, SessionLocal
from models import Role, User, Category, Book
from auth import get_password_hash


def migrate_db():
    """SQLite 轻量级迁移：补充新增字段。"""
    with engine.connect() as conn:
        # borrow_records 表
        columns = {row[1] for row in conn.execute(text("PRAGMA table_info(borrow_records)")).fetchall()}
        if "actual_lend_date" not in columns:
            conn.execute(text("ALTER TABLE borrow_records ADD COLUMN actual_lend_date DATETIME"))
            conn.commit()

        # roles 表：新增 permissions 字段
        role_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(roles)")).fetchall()}
        if "permissions" not in role_columns:
            conn.execute(text("ALTER TABLE roles ADD COLUMN permissions JSON"))
            conn.commit()

        # users 表：新增 is_active 字段
        user_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(users)")).fetchall()}
        if "is_active" not in user_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1"))
            conn.commit()


DEFAULT_ROLE_PERMISSIONS = {
    "employee": ["book:read", "borrow:create", "borrow:read-self", "notification:read"],
    "librarian": [
        "book:read", "book:write", "category:manage",
        "borrow:review", "borrow:lend-return", "borrow:read-all",
        "overdue:read", "statistics:read", "notification:read",
    ],
    "admin": [
        "user:manage", "role:manage",
        "book:read", "book:write", "category:manage",
        "borrow:review", "borrow:lend-return", "borrow:read-all",
        "overdue:read", "statistics:read", "notification:read",
    ],
}


def init_roles(db: Session):
    roles = [
        {"name": "employee", "description": "普通员工，可浏览、申请借阅、查看个人记录"},
        {"name": "librarian", "description": "图书管理员，可维护图书、审核申请、借还登记、查看统计"},
        {"name": "admin", "description": "系统管理员，可管理用户与角色权限"},
    ]
    created = {}
    for r in roles:
        role = db.query(Role).filter(Role.name == r["name"]).first()
        if not role:
            role = Role(
                name=r["name"],
                description=r["description"],
                permissions=DEFAULT_ROLE_PERMISSIONS.get(r["name"], []),
            )
            db.add(role)
            db.flush()
        else:
            # 为已有角色补充默认权限
            if not role.permissions:
                role.permissions = DEFAULT_ROLE_PERMISSIONS.get(r["name"], [])
        created[r["name"]] = role
    db.commit()
    return created


def _generate_initial_password() -> str:
    """生成随机强密码（长度约 22 字符，包含大小写字母与数字）。"""
    return secrets.token_urlsafe(16)


def _get_initial_password(role: str) -> str:
    """从环境变量读取角色初始密码；未设置则生成随机密码并打印警告。"""
    env_var = f"INITIAL_PASSWORD_{role.upper()}"
    password = os.getenv(env_var)
    if password:
        return password

    password = _generate_initial_password()
    print(
        f"WARNING: {env_var} is not set. "
        f"A random initial password has been generated for '{role}': {password}",
        file=sys.stderr,
    )
    return password


def init_users(db: Session, roles: dict):
    users = [
        {"username": "employee", "role": "employee", "department": "技术部"},
        {"username": "librarian", "role": "librarian", "department": "行政部"},
        {"username": "admin", "role": "admin", "department": "系统管理部"},
    ]
    for u in users:
        existing = db.query(User).filter(User.username == u["username"]).first()
        if existing:
            continue
        password = _get_initial_password(u["role"])
        user = User(
            username=u["username"],
            password_hash=get_password_hash(password),
            role_id=roles[u["role"]].id,
            department=u["department"],
        )
        db.add(user)
    db.commit()


def init_categories(db: Session):
    if db.query(Category).first():
        return

    tech = Category(name="技术", path="/1/", parent_id=None)
    db.add(tech)
    db.flush()

    prog = Category(name="编程语言", parent_id=tech.id, path=f"{tech.path}{tech.id}/")
    db.add(prog)
    db.flush()

    java = Category(name="Java", parent_id=prog.id, path=f"{prog.path}{prog.id}/")
    db.add(java)
    db.flush()

    mgmt = Category(name="管理", path="/2/", parent_id=None)
    db.add(mgmt)
    db.flush()

    db.commit()


def init_books(db: Session):
    if db.query(Book).first():
        return

    java = db.query(Category).filter(Category.name == "Java").first()
    mgmt = db.query(Category).filter(Category.name == "管理").first()

    books = [
        {
            "title": "Effective Java",
            "author": "Joshua Bloch",
            "isbn": "9780134685991",
            "publisher": "Addison-Wesley",
            "category_id": java.id if java else None,
            "stock": 3,
            "location": "A-1-1",
        },
        {
            "title": "深入理解 Java 虚拟机",
            "author": "周志明",
            "isbn": "9787111644230",
            "publisher": "机械工业出版社",
            "category_id": java.id if java else None,
            "stock": 2,
            "location": "A-1-2",
        },
        {
            "title": "卓有成效的管理者",
            "author": "Peter F. Drucker",
            "isbn": "9787111340508",
            "publisher": "机械工业出版社",
            "category_id": mgmt.id if mgmt else None,
            "stock": 1,
            "location": "B-2-1",
        },
    ]
    for b in books:
        existing = db.query(Book).filter(Book.isbn == b["isbn"]).first()
        if existing:
            continue
        book = Book(**b)
        db.add(book)
    db.commit()


def main():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")

    print("Running migrations...")
    migrate_db()
    print("Migrations done.")

    db = SessionLocal()
    try:
        print("Seeding roles...")
        roles = init_roles(db)

        print("Seeding users...")
        init_users(db, roles)

        print("Seeding categories...")
        init_categories(db)

        print("Seeding books...")
        init_books(db)

        print("Database initialized successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
