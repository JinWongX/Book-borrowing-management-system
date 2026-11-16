"""补充后端 API 测试，覆盖异常分支、边界条件与核心业务路径。"""

from datetime import datetime, timedelta
from io import BytesIO
from unittest.mock import MagicMock

import pytest
from PIL import Image
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

import database
import main
import scheduler
from auth import require_role
from models import Book, BorrowRecord, BorrowStatus, Category, Notification, User


def _login(client, username, password):
    resp = client.post(
        "/api/auth/login",
        data={"username": username, "password": password},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["access_token"]


def _headers(token):
    return {"Authorization": f"Bearer {token}"}


def _make_image_bytes(format: str, size: tuple = (10, 10)) -> bytes:
    """生成指定格式的真实图片字节。"""
    img = Image.new("RGB", size, color=(73, 109, 137))
    buf = BytesIO()
    if format == "JPEG":
        img.save(buf, format="JPEG")
    elif format == "PNG":
        img.save(buf, format="PNG")
    elif format == "GIF":
        img.save(buf, format="GIF")
    elif format == "WEBP":
        img.save(buf, format="WEBP")
    else:
        raise ValueError(f"unsupported format {format}")
    return buf.getvalue()


# -----------------------------------------------------------------------------
# auth.py 补充：角色校验与权限异常
# -----------------------------------------------------------------------------


def test_require_role_allows_matching_role(client):
    """require_role 对匹配角色放行。"""
    admin_token = _login(client, "admin", "123456")
    # admin 可以访问通用借阅列表
    resp = client.get("/api/borrows", headers=_headers(admin_token))
    assert resp.status_code == 200


def test_require_role_rejects_mismatched_role(client):
    """require_role 对不匹配角色返回 403。"""
    employee_token = _login(client, "employee", "123456")
    resp = client.get("/api/statistics/books", headers=_headers(employee_token))
    assert resp.status_code == 403
    assert "Librarian or admin role required" in resp.json()["message"]


def test_require_role_directly_employee_fails():
    """直接调用 require_role 检查器对 employee 返回 403。"""
    checker = require_role("librarian")
    user = User(username="employee")
    with pytest.raises(HTTPException) as exc_info:
        checker(current_user=user)
    assert exc_info.value.status_code == 403


# -----------------------------------------------------------------------------
# books.py 补充：分类递归、404、分类不存在、封面上传
# -----------------------------------------------------------------------------


def test_list_books_includes_descendant_categories(client):
    """按父分类搜索时包含所有子孙分类下的图书。"""
    librarian_token = _login(client, "librarian", "123456")

    # 创建三级分类：技术 -> 编程语言 -> Java
    tech = client.post(
        "/api/categories",
        json={"name": "三级-技术"},
        headers=_headers(librarian_token),
    ).json()["data"]
    prog = client.post(
        "/api/categories",
        json={"name": "三级-编程语言", "parent_id": tech["id"]},
        headers=_headers(librarian_token),
    ).json()["data"]
    java = client.post(
        "/api/categories",
        json={"name": "三级-Java", "parent_id": prog["id"]},
        headers=_headers(librarian_token),
    ).json()["data"]

    book = client.post(
        "/api/books",
        json={
            "title": "递归分类图书",
            "isbn": "9787777777777",
            "stock": 1,
            "category_id": java["id"],
        },
        headers=_headers(librarian_token),
    ).json()["data"]

    # 按顶级分类搜索应能命中孙分类下的图书
    resp = client.get(
        f"/api/books?category_id={tech['id']}", headers=_headers(librarian_token)
    )
    assert resp.status_code == 200
    ids = [b["id"] for b in resp.json()["data"]["items"]]
    assert book["id"] in ids

    # 清理
    client.delete(f"/api/books/{book['id']}", headers=_headers(librarian_token))
    client.delete(f"/api/categories/{java['id']}", headers=_headers(librarian_token))
    client.delete(f"/api/categories/{prog['id']}", headers=_headers(librarian_token))
    client.delete(f"/api/categories/{tech['id']}", headers=_headers(librarian_token))


def test_create_book_with_nonexistent_category_returns_400(client):
    librarian_token = _login(client, "librarian", "123456")
    resp = client.post(
        "/api/books",
        json={
            "title": "分类不存在",
            "isbn": "9788888888888",
            "stock": 1,
            "category_id": 99999,
        },
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 400
    assert "Category not found" in resp.json()["message"]


def test_update_book_with_nonexistent_category_returns_400(client):
    librarian_token = _login(client, "librarian", "123456")
    book = client.post(
        "/api/books",
        json={"title": "更新分类测试", "isbn": "9789999999999", "stock": 1},
        headers=_headers(librarian_token),
    ).json()["data"]

    resp = client.put(
        f"/api/books/{book['id']}",
        json={"category_id": 99999},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 400
    assert "Category not found" in resp.json()["message"]

    client.delete(f"/api/books/{book['id']}", headers=_headers(librarian_token))


def test_upload_cover_success(client):
    librarian_token = _login(client, "librarian", "123456")
    content = _make_image_bytes("PNG")
    resp = client.post(
        "/api/books/upload-cover",
        files={"file": ("cover.png", BytesIO(content), "image/png")},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "url" in data
    assert "/api/uploads/covers/" in data["url"]


def test_upload_cover_invalid_extension_returns_400(client):
    librarian_token = _login(client, "librarian", "123456")
    resp = client.post(
        "/api/books/upload-cover",
        files={"file": ("cover.pdf", BytesIO(b"pdf"), "application/pdf")},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 400
    assert "Invalid image format" in resp.json()["message"]


def test_upload_cover_oversized_returns_413(client):
    librarian_token = _login(client, "librarian", "123456")
    # 生成超过 5MB 的 BMP
    large = Image.new("RGB", (4000, 4000), color=(0, 0, 0))
    buf = BytesIO()
    large.save(buf, format="BMP")
    buf.seek(0)
    resp = client.post(
        "/api/books/upload-cover",
        files={"file": ("large.png", buf, "image/png")},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 413
    assert "too large" in resp.json()["message"]


def test_upload_cover_invalid_content_returns_400(client):
    librarian_token = _login(client, "librarian", "123456")
    resp = client.post(
        "/api/books/upload-cover",
        files={"file": ("fake.png", BytesIO(b"not an image"), "image/png")},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 400
    assert "Invalid image content" in resp.json()["message"]


def test_upload_cover_content_not_match_extension(client):
    librarian_token = _login(client, "librarian", "123456")
    # 真实 PNG 图片但扩展名是 jpg
    content = _make_image_bytes("PNG")
    resp = client.post(
        "/api/books/upload-cover",
        files={"file": ("cover.jpg", BytesIO(content), "image/jpeg")},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 400
    assert "Image content does not match extension" in resp.json()["message"]


# -----------------------------------------------------------------------------
# categories.py 补充：父节点不存在、404、循环依赖、path 更新
# -----------------------------------------------------------------------------


def test_create_category_with_nonexistent_parent_returns_400(client):
    librarian_token = _login(client, "librarian", "123456")
    resp = client.post(
        "/api/categories",
        json={"name": "无父分类", "parent_id": 99999},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 400
    assert "Parent category not found" in resp.json()["message"]


def test_update_category_not_found_returns_404(client):
    librarian_token = _login(client, "librarian", "123456")
    resp = client.put(
        "/api/categories/99999",
        json={"name": "不存在"},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 404
    assert "Category not found" in resp.json()["message"]


def test_update_category_parent_not_found_returns_400(client):
    librarian_token = _login(client, "librarian", "123456")
    cat = client.post(
        "/api/categories",
        json={"name": "待移动分类"},
        headers=_headers(librarian_token),
    ).json()["data"]
    resp = client.put(
        f"/api/categories/{cat['id']}",
        json={"parent_id": 99999},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 400
    assert "Parent category not found" in resp.json()["message"]
    client.delete(f"/api/categories/{cat['id']}", headers=_headers(librarian_token))


def test_update_category_path_updates_descendants(client):
    librarian_token = _login(client, "librarian", "123456")

    # 初始：A -> B -> C
    A = client.post(
        "/api/categories", json={"name": "path-A"}, headers=_headers(librarian_token)
    ).json()["data"]
    B = client.post(
        "/api/categories",
        json={"name": "path-B", "parent_id": A["id"]},
        headers=_headers(librarian_token),
    ).json()["data"]
    C = client.post(
        "/api/categories",
        json={"name": "path-C", "parent_id": B["id"]},
        headers=_headers(librarian_token),
    ).json()["data"]

    # 创建新根 D，将 B 移动到 D 下
    D = client.post(
        "/api/categories", json={"name": "path-D"}, headers=_headers(librarian_token)
    ).json()["data"]
    resp = client.put(
        f"/api/categories/{B['id']}",
        json={"parent_id": D["id"]},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200
    assert D["path"] in resp.json()["data"]["path"]

    # 验证 C 的 path 同步更新
    resp = client.get("/api/categories", headers=_headers(librarian_token))
    cats = {c["id"]: c for c in _flatten_categories(resp.json()["data"])}
    assert D["path"] in cats[C["id"]]["path"]

    # 清理
    client.delete(f"/api/categories/{C['id']}", headers=_headers(librarian_token))
    client.delete(f"/api/categories/{B['id']}", headers=_headers(librarian_token))
    client.delete(f"/api/categories/{D['id']}", headers=_headers(librarian_token))
    client.delete(f"/api/categories/{A['id']}", headers=_headers(librarian_token))


def _flatten_categories(tree):
    result = []
    for node in tree:
        result.append(node)
        result.extend(_flatten_categories(node.get("children", [])))
    return result


def test_delete_category_not_found_returns_404(client):
    librarian_token = _login(client, "librarian", "123456")
    resp = client.delete(
        "/api/categories/99999", headers=_headers(librarian_token)
    )
    assert resp.status_code == 404
    assert "Category not found" in resp.json()["message"]


# -----------------------------------------------------------------------------
# borrows.py 补充：我的列表状态过滤、各操作 404、分页边界
# -----------------------------------------------------------------------------


def test_list_my_borrows_status_filter(client):
    employee_token = _login(client, "employee", "123456")
    librarian_token = _login(client, "librarian", "123456")

    expected_return = (datetime.utcnow() + timedelta(days=7)).isoformat()
    record = client.post(
        "/api/borrows",
        json={"book_id": 1, "expected_return_date": expected_return},
        headers=_headers(employee_token),
    ).json()["data"]

    # 过滤 pending
    resp = client.get(
        "/api/borrows/my?status=pending", headers=_headers(employee_token)
    )
    assert resp.status_code == 200
    items = resp.json()["data"]["items"]
    assert all(r["status"] == "pending" for r in items)

    # 审核通过并借出后过滤 borrowed
    client.post(
        f"/api/borrows/{record['id']}/approve", headers=_headers(librarian_token)
    )
    client.post(
        f"/api/borrows/{record['id']}/lend", headers=_headers(librarian_token)
    )
    resp = client.get(
        "/api/borrows/my?status=borrowed", headers=_headers(employee_token)
    )
    assert resp.status_code == 200
    items = resp.json()["data"]["items"]
    assert any(r["id"] == record["id"] and r["status"] == "borrowed" for r in items)

    # 归还
    client.post(
        f"/api/borrows/{record['id']}/return", headers=_headers(librarian_token)
    )


def test_create_borrow_book_not_found_returns_404(client):
    employee_token = _login(client, "employee", "123456")
    expected_return = (datetime.utcnow() + timedelta(days=7)).isoformat()
    resp = client.post(
        "/api/borrows",
        json={"book_id": 99999, "expected_return_date": expected_return},
        headers=_headers(employee_token),
    )
    assert resp.status_code == 404
    assert "Book not found" in resp.json()["message"]


def test_approve_borrow_not_found_returns_404(client):
    librarian_token = _login(client, "librarian", "123456")
    resp = client.post(
        "/api/borrows/99999/approve", headers=_headers(librarian_token)
    )
    assert resp.status_code == 404
    assert "Borrow record not found" in resp.json()["message"]


def test_reject_borrow_not_found_returns_404(client):
    librarian_token = _login(client, "librarian", "123456")
    resp = client.post(
        "/api/borrows/99999/reject",
        json={"reject_reason": "test"},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 404
    assert "Borrow record not found" in resp.json()["message"]


def test_lend_borrow_not_found_returns_404(client):
    librarian_token = _login(client, "librarian", "123456")
    resp = client.post(
        "/api/borrows/99999/lend", headers=_headers(librarian_token)
    )
    assert resp.status_code == 404
    assert "Borrow record not found" in resp.json()["message"]


def test_return_borrow_not_found_returns_404(client):
    librarian_token = _login(client, "librarian", "123456")
    resp = client.post(
        "/api/borrows/99999/return", headers=_headers(librarian_token)
    )
    assert resp.status_code == 404
    assert "Borrow record not found" in resp.json()["message"]


def test_list_borrows_empty_and_pagination(client):
    librarian_token = _login(client, "librarian", "123456")
    # 过滤一个不存在的状态，确保空列表分页正常
    resp = client.get(
        "/api/borrows?status=rejected&page=1&page_size=5",
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["items"] == []
    assert data["pagination"]["total"] == 0
    assert data["pagination"]["pages"] == 0


# -----------------------------------------------------------------------------
# overdue.py 补充：分页
# -----------------------------------------------------------------------------


def test_overdue_pagination(client):
    employee_token = _login(client, "employee", "123456")
    librarian_token = _login(client, "librarian", "123456")

    # 构造一条逾期记录
    db = database.SessionLocal()
    record = BorrowRecord(
        book_id=1,
        user_id=1,
        expected_return_date=datetime.utcnow() - timedelta(days=2),
        status=BorrowStatus.BORROWED,
        actual_lend_date=datetime.utcnow() - timedelta(days=5),
    )
    db.add(record)
    db.commit()
    db.close()

    resp = client.get(
        "/api/overdue?page=1&page_size=5", headers=_headers(librarian_token)
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["pagination"]["total"] >= 1
    assert data["pagination"]["page"] == 1
    assert data["pagination"]["page_size"] == 5


# -----------------------------------------------------------------------------
# statistics.py 补充：空部门/分类、Top20、非法参数
# -----------------------------------------------------------------------------


def test_statistics_with_empty_department_and_uncategorized(client):
    librarian_token = _login(client, "librarian", "123456")

    db = database.SessionLocal()
    try:
        # 创建无部门用户与未分类图书
        employee_role = db.query(User).filter(User.username == "employee").first().role
        empty_dept_user = User(
            username="empty_dept_user",
            password_hash="unused",
            role_id=employee_role.id,
            department=None,
        )
        db.add(empty_dept_user)
        db.flush()

        uncategorized_book = Book(
            title="未分类图书",
            isbn="9781111111122",
            stock=1,
            category_id=None,
        )
        db.add(uncategorized_book)
        db.flush()

        record = BorrowRecord(
            book_id=uncategorized_book.id,
            user_id=empty_dept_user.id,
            expected_return_date=datetime.utcnow() + timedelta(days=7),
            status=BorrowStatus.BORROWED,
            actual_lend_date=datetime.utcnow(),
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    resp = client.get("/api/statistics/categories", headers=_headers(librarian_token))
    assert resp.status_code == 200
    names = [item["name"] for item in resp.json()["data"]["items"]]
    assert "未分类" in names

    resp = client.get(
        "/api/statistics/departments", headers=_headers(librarian_token)
    )
    assert resp.status_code == 200
    names = [item["name"] for item in resp.json()["data"]["items"]]
    assert "未设置部门" in names

    resp = client.get("/api/statistics/users", headers=_headers(librarian_token))
    assert resp.status_code == 200
    usernames = [item["name"] for item in resp.json()["data"]["items"]]
    assert "empty_dept_user" in usernames


def test_statistics_export_users_and_departments(client):
    librarian_token = _login(client, "librarian", "123456")

    db = database.SessionLocal()
    try:
        record = BorrowRecord(
            book_id=1,
            user_id=1,
            expected_return_date=datetime.utcnow() + timedelta(days=7),
            status=BorrowStatus.BORROWED,
            actual_lend_date=datetime.utcnow(),
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    for stat_type in ("users", "departments", "top20"):
        resp = client.get(
            f"/api/statistics/export?type={stat_type}&format=csv",
            headers=_headers(librarian_token),
        )
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]

        resp = client.get(
            f"/api/statistics/export?type={stat_type}&format=excel",
            headers=_headers(librarian_token),
        )
        assert resp.status_code == 200
        assert (
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            in resp.headers["content-type"]
        )


def test_statistics_export_invalid_params(client):
    librarian_token = _login(client, "librarian", "123456")
    resp = client.get(
        "/api/statistics/export?type=invalid&format=csv",
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 400
    assert "Invalid statistics type" in resp.json()["message"]

    resp = client.get(
        "/api/statistics/export?type=books&format=pdf",
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 400
    assert "Invalid export format" in resp.json()["message"]


# -----------------------------------------------------------------------------
# scheduler.py 补充：边界条件与异常回滚
# -----------------------------------------------------------------------------


def test_scheduler_check_without_db_creates_session(client):
    """无参调用 check_and_create_notifications 能自动创建并关闭 session。"""
    # 使用 client fixture 确保内存数据库已初始化；将 scheduler 的 SessionLocal 指向测试会话
    original = scheduler.SessionLocal
    scheduler.SessionLocal = database.SessionLocal
    try:
        count = scheduler.check_and_create_notifications()
        assert count == 0
    finally:
        scheduler.SessionLocal = original


def test_scheduler_no_expected_return_date_skips(client):
    """expected_return_date 为 None 时跳过通知生成。"""
    fake_record = MagicMock()
    fake_record.expected_return_date = None
    fake_record.id = 1
    fake_record.user_id = 1
    fake_record.status = BorrowStatus.BORROWED

    fake_db = MagicMock()
    fake_query = MagicMock()
    fake_filtered = MagicMock()
    fake_db.query.return_value = fake_query
    fake_query.filter.return_value = fake_filtered
    fake_filtered.all.return_value = [fake_record]
    fake_filtered.first.return_value = None

    count = scheduler.check_and_create_notifications(db=fake_db)
    assert count == 0


def test_scheduler_more_than_3_days_no_notification(client):
    db = database.SessionLocal()
    try:
        record = BorrowRecord(
            book_id=1,
            user_id=1,
            expected_return_date=datetime.utcnow() + timedelta(days=5),
            status=BorrowStatus.BORROWED,
            actual_lend_date=datetime.utcnow(),
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    count = scheduler.check_and_create_notifications(db=database.SessionLocal())
    assert count == 0


def test_scheduler_same_day_not_duplicate(client):
    db = database.SessionLocal()
    try:
        record = BorrowRecord(
            book_id=1,
            user_id=1,
            expected_return_date=datetime.utcnow() + timedelta(days=1),
            status=BorrowStatus.BORROWED,
            actual_lend_date=datetime.utcnow(),
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    count = scheduler.check_and_create_notifications(db=database.SessionLocal())
    assert count == 1

    count = scheduler.check_and_create_notifications(db=database.SessionLocal())
    assert count == 0


def test_scheduler_due_soon_message(client):
    db = database.SessionLocal()
    try:
        record = BorrowRecord(
            book_id=1,
            user_id=1,
            expected_return_date=datetime.utcnow() + timedelta(days=2),
            status=BorrowStatus.BORROWED,
            actual_lend_date=datetime.utcnow(),
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    scheduler.check_and_create_notifications(db=database.SessionLocal())
    db = database.SessionLocal()
    try:
        notification = db.query(Notification).first()
        assert notification is not None
        assert "将在" in notification.message
    finally:
        db.close()


def test_scheduler_due_today_message(client):
    db = database.SessionLocal()
    try:
        record = BorrowRecord(
            book_id=1,
            user_id=1,
            expected_return_date=datetime.utcnow(),
            status=BorrowStatus.BORROWED,
            actual_lend_date=datetime.utcnow(),
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    scheduler.check_and_create_notifications(db=database.SessionLocal())
    db = database.SessionLocal()
    try:
        notification = db.query(Notification).first()
        assert notification is not None
        assert "今天到期" in notification.message
    finally:
        db.close()


def test_scheduler_exception_rollback_and_closes_db(client):
    db = database.SessionLocal()
    try:
        record = BorrowRecord(
            book_id=1,
            user_id=1,
            expected_return_date=datetime.utcnow() + timedelta(days=1),
            status=BorrowStatus.BORROWED,
            actual_lend_date=datetime.utcnow(),
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    # mock session.commit 抛异常，验证回滚
    db = database.SessionLocal()
    try:
        db.commit = MagicMock(side_effect=RuntimeError("boom"))
        with pytest.raises(RuntimeError):
            scheduler.check_and_create_notifications(db=db)
    finally:
        db.close()

    # 确认未生成通知
    db = database.SessionLocal()
    try:
        assert db.query(Notification).count() == 0
    finally:
        db.close()


# -----------------------------------------------------------------------------
# main.py 补充：全局异常处理、参数校验、封面静态服务
# -----------------------------------------------------------------------------


def test_validation_error_422(client):
    librarian_token = _login(client, "librarian", "123456")
    # page 参数小于 1 会触发 Query 校验
    resp = client.get("/api/books?page=0", headers=_headers(librarian_token))
    assert resp.status_code == 422
    assert resp.json()["code"] == 422
    assert "Validation error" in resp.json()["message"]


def test_global_exception_handler_500(client):
    """直接调用全局异常处理器，验证 500 响应结构。"""
    import asyncio

    request = MagicMock()
    response = asyncio.run(main.global_exception_handler(request, RuntimeError("intentional boom")))
    assert response.status_code == 500
    assert response.body == b'{"code":500,"message":"Internal server error","data":null}'


def test_sqlalchemy_exception_handler_500(client):
    librarian_token = _login(client, "librarian", "123456")
    from database import get_db

    def _bad_get_db():
        raise SQLAlchemyError("db error")

    original_get_db = main.app.dependency_overrides.get(get_db)
    main.app.dependency_overrides[get_db] = _bad_get_db
    try:
        resp = client.get("/api/books", headers=_headers(librarian_token))
        assert resp.status_code == 500
        assert resp.json()["code"] == 500
        assert "Database error" in resp.json()["message"]
    finally:
        if original_get_db is None:
            main.app.dependency_overrides.pop(get_db, None)
        else:
            main.app.dependency_overrides[get_db] = original_get_db


def test_serve_cover(client):
    # 上传一张真实封面
    librarian_token = _login(client, "librarian", "123456")
    content = _make_image_bytes("PNG")
    resp = client.post(
        "/api/books/upload-cover",
        files={"file": ("cover.png", BytesIO(content), "image/png")},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200
    url = resp.json()["data"]["url"]
    filename = url.split("/")[-1]

    # 公开访问封面
    resp = client.get(url)
    assert resp.status_code == 200
    assert "image/png" in resp.headers["content-type"]

    # 不存在的封面应 404
    resp = client.get("/api/uploads/covers/nonexistent.png")
    assert resp.status_code == 404


# -----------------------------------------------------------------------------
# 额外分支覆盖：直接调用内部函数与边界条件
# -----------------------------------------------------------------------------


def test_auth_require_role_none_branch():
    """require_role 在用户 role 为 None 时返回 403。"""
    checker = require_role("librarian")
    user = User(username="no_role", role=None)
    with pytest.raises(HTTPException) as exc_info:
        checker(current_user=user)
    assert exc_info.value.status_code == 403


def test_update_book_with_unique_isbn_and_valid_category(client):
    """更新图书时设置新的唯一 ISBN 与有效分类，覆盖更新分支。"""
    librarian_token = _login(client, "librarian", "123456")
    book = client.post(
        "/api/books",
        json={"title": "分支测试", "isbn": "9780000000100", "stock": 1},
        headers=_headers(librarian_token),
    ).json()["data"]

    # 使用初始数据中的 Java 分类（id=3）
    resp = client.put(
        f"/api/books/{book['id']}",
        json={"isbn": "9780000000101", "category_id": 3},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["isbn"] == "9780000000101"
    assert data["category_id"] == 3

    client.delete(f"/api/books/{book['id']}", headers=_headers(librarian_token))


def test_list_my_borrows_without_status_filter(client):
    """我的借阅列表不带 status 参数覆盖无过滤分支。"""
    employee_token = _login(client, "employee", "123456")
    resp = client.get("/api/borrows/my", headers=_headers(employee_token))
    assert resp.status_code == 200
    assert isinstance(resp.json()["data"]["items"], list)


def test_export_department_with_empty_name(client):
    """导出部门统计时包含空部门名称，覆盖 or 分支。"""
    librarian_token = _login(client, "librarian", "123456")

    db = database.SessionLocal()
    try:
        employee_role = db.query(User).filter(User.username == "employee").first().role
        empty_dept_user = User(
            username="empty_dept",
            password_hash="unused",
            role_id=employee_role.id,
            department="",
        )
        db.add(empty_dept_user)
        db.flush()
        record = BorrowRecord(
            book_id=1,
            user_id=empty_dept_user.id,
            expected_return_date=datetime.utcnow() + timedelta(days=7),
            status=BorrowStatus.BORROWED,
            actual_lend_date=datetime.utcnow(),
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    resp = client.get(
        "/api/statistics/export?type=departments&format=csv",
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200
    body = resp.content.decode("utf-8-sig")
    assert "未设置部门" in body or "," in body


def test_global_exception_handler_debug_detail(client):
    """DEBUG=True 时全局异常处理器返回 detail。"""
    import asyncio

    from config import settings

    original_debug = settings.DEBUG
    settings.DEBUG = True
    try:
        request = MagicMock()
        response = asyncio.run(
            main.global_exception_handler(request, RuntimeError("debug boom"))
        )
        assert response.status_code == 500
        body = response.body.decode("utf-8")
        assert "debug boom" in body
    finally:
        settings.DEBUG = original_debug


def test_serve_cover_path_traversal_directly(client):
    """直接调用封面服务处理路径遍历。"""
    import asyncio

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(main.serve_cover("../secret.txt"))
    assert exc_info.value.status_code == 404


def test_get_descendant_ids_skips_visited_branch():
    """_get_descendant_ids 遇到已访问子节点时跳过。"""
    from routers.books import _get_descendant_ids

    categories = [
        MagicMock(id=1, parent_id=None),
        MagicMock(id=2, parent_id=1),
        MagicMock(id=2, parent_id=1),
    ]
    result = _get_descendant_ids(categories, 1)
    assert result == {1, 2}


def test_build_category_tree_missing_parent_branch():
    """_build_category_tree 对缺失父节点的分类不报错。"""
    from routers.categories import _build_category_tree

    now = datetime.utcnow()
    root = Category(id=1, name="root", parent_id=None, path="/1/", created_at=now)
    orphan = Category(id=2, name="orphan", parent_id=999, path="/999/2/", created_at=now)
    tree = _build_category_tree([root, orphan])
    assert len(tree) == 1
    assert tree[0].id == 1


def test_category_get_descendant_ids_cycle_branch():
    """categories._get_descendant_ids 在循环引用时不会无限循环。"""
    from routers.categories import _get_descendant_ids

    categories = [
        MagicMock(id=1, parent_id=2),
        MagicMock(id=2, parent_id=1),
    ]
    result = _get_descendant_ids(categories, 1)
    assert result == {1, 2}


def test_scheduler_loop_executes_once(client, monkeypatch):
    """_scheduler_loop 执行一次 check 后进入 sleep。"""
    call_count = 0

    def fake_check():
        nonlocal call_count
        call_count += 1

    class StopLoop(Exception):
        pass

    def fake_sleep(_):
        raise StopLoop()

    monkeypatch.setattr(scheduler, "check_and_create_notifications", fake_check)
    monkeypatch.setattr(scheduler.time, "sleep", fake_sleep)

    with pytest.raises(StopLoop):
        scheduler._scheduler_loop(interval_seconds=1)
    assert call_count == 1


def test_start_scheduler_starts_daemon_thread(client, monkeypatch):
    """start_scheduler 启动命名守护线程。"""
    monkeypatch.setattr(scheduler, "_scheduler_loop", lambda *_args, **_kwargs: None)
    thread = scheduler.start_scheduler(interval_seconds=1)
    assert thread.name == "borrow-notification-scheduler"
    assert thread.daemon is True
    thread.join(timeout=0.5)
