from datetime import datetime, timedelta

import database
import scheduler
from auth import create_access_token
from models import Book, BorrowRecord, BorrowStatus, Category, Notification


def _login(client, username, password):
    resp = client.post(
        "/api/auth/login",
        data={"username": username, "password": password},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["access_token"]


def _headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_login_success(client):
    token = _login(client, "employee", "123456")
    assert token

    resp = client.get("/api/auth/me", headers=_headers(token))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["username"] == "employee"


def test_login_failure(client):
    resp = client.post(
        "/api/auth/login",
        data={"username": "employee", "password": "wrong-password"},
    )
    assert resp.status_code == 401
    assert resp.json()["code"] == 401


def test_category_crud_permission(client):
    employee_token = _login(client, "employee", "123456")
    librarian_token = _login(client, "librarian", "123456")

    # 普通员工可以查看分类树
    resp = client.get("/api/categories", headers=_headers(employee_token))
    assert resp.status_code == 200
    assert isinstance(resp.json()["data"], list)

    # 普通员工无权限创建分类
    resp = client.post(
        "/api/categories",
        json={"name": "测试分类", "parent_id": None},
        headers=_headers(employee_token),
    )
    assert resp.status_code == 403

    # 图书管理员可以创建分类
    resp = client.post(
        "/api/categories",
        json={"name": "测试分类", "parent_id": None},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200
    cat_id = resp.json()["data"]["id"]

    # 更新分类
    resp = client.put(
        f"/api/categories/{cat_id}",
        json={"name": "测试分类-已更新"},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "测试分类-已更新"

    # 删除分类
    resp = client.delete(
        f"/api/categories/{cat_id}",
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200


def test_category_delete_constraints(client):
    librarian_token = _login(client, "librarian", "123456")

    # 创建父分类与子分类
    parent = client.post(
        "/api/categories",
        json={"name": "父分类"},
        headers=_headers(librarian_token),
    ).json()["data"]
    child = client.post(
        "/api/categories",
        json={"name": "子分类", "parent_id": parent["id"]},
        headers=_headers(librarian_token),
    ).json()["data"]

    # 不能删除含有子分类的分类
    resp = client.delete(
        f"/api/categories/{parent['id']}",
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 400
    assert "sub-categories" in resp.json()["message"]

    # 创建图书关联到子分类
    book = client.post(
        "/api/books",
        json={
            "title": "关联测试图书",
            "isbn": "9780000000001",
            "stock": 1,
            "category_id": child["id"],
        },
        headers=_headers(librarian_token),
    ).json()["data"]

    # 不能删除含有图书的分类
    resp = client.delete(
        f"/api/categories/{child['id']}",
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 400
    assert "associated books" in resp.json()["message"]

    # 清理：删除图书后再删除分类
    resp = client.delete(
        f"/api/books/{book['id']}",
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200
    resp = client.delete(
        f"/api/categories/{child['id']}",
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200
    resp = client.delete(
        f"/api/categories/{parent['id']}",
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200


def test_book_crud_and_isbn_uniqueness(client):
    employee_token = _login(client, "employee", "123456")
    librarian_token = _login(client, "librarian", "123456")

    # 员工无权限创建图书
    resp = client.post(
        "/api/books",
        json={"title": "测试图书", "isbn": "9781111111111", "stock": 1},
        headers=_headers(employee_token),
    )
    assert resp.status_code == 403

    # 管理员创建图书
    resp = client.post(
        "/api/books",
        json={"title": "测试图书", "isbn": "9781111111111", "stock": 1},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200
    book_id = resp.json()["data"]["id"]
    assert resp.json()["data"]["stock"] == 1

    # 重复 ISBN 应被拒绝
    resp = client.post(
        "/api/books",
        json={"title": "重复 ISBN", "isbn": "9781111111111", "stock": 1},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 400
    assert "ISBN already exists" in resp.json()["message"]

    # 更新时重复 ISBN 应被拒绝
    another = client.post(
        "/api/books",
        json={"title": "另一本图书", "isbn": "9782222222222", "stock": 1},
        headers=_headers(librarian_token),
    ).json()["data"]
    resp = client.put(
        f"/api/books/{another['id']}",
        json={"isbn": "9781111111111"},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 400
    assert "ISBN already exists" in resp.json()["message"]

    # 更新其他字段成功
    resp = client.put(
        f"/api/books/{book_id}",
        json={"title": "测试图书-已更新", "stock": 5},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["title"] == "测试图书-已更新"
    assert resp.json()["data"]["stock"] == 5

    # 查询单本图书
    resp = client.get(f"/api/books/{book_id}", headers=_headers(librarian_token))
    assert resp.status_code == 200
    assert resp.json()["data"]["id"] == book_id

    # 删除图书
    resp = client.delete(
        f"/api/books/{book_id}",
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200
    resp = client.delete(
        f"/api/books/{another['id']}",
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200


def test_book_search(client):
    librarian_token = _login(client, "librarian", "123456")

    # 使用初始数据中的 Effective Java（id=1，分类为 Java）
    resp = client.get("/api/books?keyword=Effective", headers=_headers(librarian_token))
    assert resp.status_code == 200
    assert resp.json()["data"]["pagination"]["total"] >= 1

    resp = client.get(
        "/api/books?keyword=9780134685991", headers=_headers(librarian_token)
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["pagination"]["total"] == 1

    # 按分类搜索（Java 分类 id=3）
    resp = client.get("/api/books?category_id=3", headers=_headers(librarian_token))
    assert resp.status_code == 200
    assert resp.json()["data"]["pagination"]["total"] >= 2


def test_borrow_full_flow(client):
    employee_token = _login(client, "employee", "123456")
    librarian_token = _login(client, "librarian", "123456")

    # 员工发起借阅申请（使用 Effective Java，id=1，初始库存 3）
    expected_return = (datetime.utcnow() + timedelta(days=7)).isoformat()
    resp = client.post(
        "/api/borrows",
        json={"book_id": 1, "expected_return_date": expected_return},
        headers=_headers(employee_token),
    )
    assert resp.status_code == 200
    record = resp.json()["data"]
    assert record["status"] == "pending"
    borrow_id = record["id"]

    # 管理员查看待审核列表
    resp = client.get("/api/borrows/pending", headers=_headers(librarian_token))
    assert resp.status_code == 200
    assert any(r["id"] == borrow_id for r in resp.json()["data"]["items"])

    # 审核通过
    resp = client.post(
        f"/api/borrows/{borrow_id}/approve",
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "approved"

    # 借出登记，库存减少
    resp = client.post(
        f"/api/borrows/{borrow_id}/lend",
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "borrowed"
    assert data["actual_lend_date"] is not None
    assert data["book"]["stock"] == 2

    # 归还登记，库存恢复
    resp = client.post(
        f"/api/borrows/{borrow_id}/return",
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "returned"
    assert data["actual_return_date"] is not None
    assert data["book"]["stock"] == 3


def test_borrow_reject(client):
    employee_token = _login(client, "employee", "123456")
    librarian_token = _login(client, "librarian", "123456")

    expected_return = (datetime.utcnow() + timedelta(days=7)).isoformat()
    resp = client.post(
        "/api/borrows",
        json={"book_id": 2, "expected_return_date": expected_return},
        headers=_headers(employee_token),
    )
    borrow_id = resp.json()["data"]["id"]

    resp = client.post(
        f"/api/borrows/{borrow_id}/reject",
        json={"reject_reason": "库存紧张"},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "rejected"
    assert data["reject_reason"] == "库存紧张"


def test_borrow_out_of_stock(client):
    employee_token = _login(client, "employee", "123456")
    librarian_token = _login(client, "librarian", "123456")

    # 创建库存为 0 的图书
    book = client.post(
        "/api/books",
        json={"title": "零库存图书", "isbn": "9783333333333", "stock": 0},
        headers=_headers(librarian_token),
    ).json()["data"]

    expected_return = (datetime.utcnow() + timedelta(days=7)).isoformat()
    resp = client.post(
        "/api/borrows",
        json={"book_id": book["id"], "expected_return_date": expected_return},
        headers=_headers(employee_token),
    )
    assert resp.status_code == 400
    assert "Book out of stock" in resp.json()["message"]


def test_list_borrows_with_status_filter(client):
    employee_token = _login(client, "employee", "123456")
    librarian_token = _login(client, "librarian", "123456")

    expected_return = (datetime.utcnow() + timedelta(days=7)).isoformat()
    resp = client.post(
        "/api/borrows",
        json={"book_id": 1, "expected_return_date": expected_return},
        headers=_headers(employee_token),
    )
    borrow_id = resp.json()["data"]["id"]

    # 普通员工无权限访问通用借阅列表
    resp = client.get("/api/borrows", headers=_headers(employee_token))
    assert resp.status_code == 403

    # 图书管理员可按状态过滤
    resp = client.get("/api/borrows?status=pending", headers=_headers(librarian_token))
    assert resp.status_code == 200
    items = resp.json()["data"]["items"]
    assert any(r["id"] == borrow_id for r in items)

    # 审核通过并借出
    client.post(
        f"/api/borrows/{borrow_id}/approve", headers=_headers(librarian_token)
    )
    client.post(f"/api/borrows/{borrow_id}/lend", headers=_headers(librarian_token))

    resp = client.get(
        "/api/borrows?status=borrowed&status=returned", headers=_headers(librarian_token)
    )
    assert resp.status_code == 200
    items = resp.json()["data"]["items"]
    assert any(r["id"] == borrow_id and r["status"] == "borrowed" for r in items)


def test_overdue_notification_generation(client):
    employee_token = _login(client, "employee", "123456")
    librarian_token = _login(client, "librarian", "123456")

    # 在数据库中直接构造一条已逾期借阅记录
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
    db.refresh(record)

    # 执行逾期提醒生成任务
    created = scheduler.check_and_create_notifications(db=db)
    assert created == 1

    notification = db.query(Notification).first()
    assert notification is not None
    assert "逾期" in notification.message
    db.close()

    # 员工在消息中心可见该提醒
    resp = client.get("/api/notifications", headers=_headers(employee_token))
    assert resp.status_code == 200
    messages = [n["message"] for n in resp.json()["data"]["items"]]
    assert any("逾期" in m for m in messages)

    # 管理员可在逾期列表中查看
    resp = client.get("/api/overdue", headers=_headers(librarian_token))
    assert resp.status_code == 200
    assert resp.json()["data"]["pagination"]["total"] == 1
    overdue_item = resp.json()["data"]["items"][0]
    assert overdue_item["overdue_days"] >= 2


def test_statistics_endpoints(client):
    librarian_token = _login(client, "librarian", "123456")
    employee_token = _login(client, "employee", "123456")

    # 直接构造一条有效借阅记录用于统计
    db = database.SessionLocal()
    record = BorrowRecord(
        book_id=1,
        user_id=1,
        expected_return_date=datetime.utcnow() + timedelta(days=7),
        status=BorrowStatus.BORROWED,
        actual_lend_date=datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    db.close()

    endpoints = [
        "/api/statistics/books",
        "/api/statistics/categories",
        "/api/statistics/departments",
        "/api/statistics/users",
        "/api/statistics/top20",
    ]
    for url in endpoints:
        resp = client.get(url, headers=_headers(librarian_token))
        assert resp.status_code == 200, f"{url} failed: {resp.text}"
        items = resp.json()["data"]["items"]
        assert isinstance(items, list)
        assert len(items) >= 1

    # 普通员工无权限访问统计
    resp = client.get("/api/statistics/books", headers=_headers(employee_token))
    assert resp.status_code == 403


def test_export_csv_and_excel(client):
    librarian_token = _login(client, "librarian", "123456")

    # 构造有效借阅记录，确保导出内容非空
    db = database.SessionLocal()
    record = BorrowRecord(
        book_id=1,
        user_id=1,
        expected_return_date=datetime.utcnow() + timedelta(days=7),
        status=BorrowStatus.BORROWED,
        actual_lend_date=datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    db.close()

    # CSV 导出
    resp = client.get(
        "/api/statistics/export?type=books&format=csv",
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "attachment" in resp.headers["content-disposition"]
    body = resp.content.decode("utf-8-sig")
    assert "图书ID" in body
    assert "Effective Java" in body

    # Excel 导出
    resp = client.get(
        "/api/statistics/export?type=books&format=excel",
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 200
    assert (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        in resp.headers["content-type"]
    )
    assert "attachment" in resp.headers["content-disposition"]
    assert len(resp.content) > 0


def test_invalid_or_expired_token_returns_401(client):
    # 未携带 Token 访问受保护接口
    resp = client.get("/api/books")
    assert resp.status_code == 401

    # 格式非法的 Token
    resp = client.get(
        "/api/books", headers={"Authorization": "Bearer invalid-token"}
    )
    assert resp.status_code == 401

    # 已过期的 Token
    expired_token = create_access_token(
        {"sub": "1"}, expires_delta=timedelta(minutes=-1)
    )
    resp = client.get("/api/books", headers=_headers(expired_token))
    assert resp.status_code == 401

    # 缺少 sub 字段的 Token
    missing_sub_token = create_access_token({}, expires_delta=timedelta(hours=1))
    resp = client.get("/api/books", headers=_headers(missing_sub_token))
    assert resp.status_code == 401

    # Token 对应用户不存在
    nonexistent_user_token = create_access_token(
        {"sub": "99999"}, expires_delta=timedelta(hours=1)
    )
    resp = client.get("/api/books", headers=_headers(nonexistent_user_token))
    assert resp.status_code == 401


def test_employee_access_admin_endpoint_returns_403(client):
    employee_token = _login(client, "employee", "123456")
    resp = client.get("/api/borrows/pending", headers=_headers(employee_token))
    assert resp.status_code == 403


def test_isbn_duplicate_create_and_update_returns_400(client):
    librarian_token = _login(client, "librarian", "123456")

    book = client.post(
        "/api/books",
        json={"title": "ISBN 唯一性测试", "isbn": "9784444444444", "stock": 1},
        headers=_headers(librarian_token),
    ).json()["data"]

    # 新增重复 ISBN
    resp = client.post(
        "/api/books",
        json={"title": "重复图书", "isbn": "9784444444444", "stock": 1},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 400
    assert "ISBN already exists" in resp.json()["message"]

    # 更新时重复 ISBN
    another = client.post(
        "/api/books",
        json={"title": "另一本图书", "isbn": "9785555555555", "stock": 1},
        headers=_headers(librarian_token),
    ).json()["data"]
    resp = client.put(
        f"/api/books/{another['id']}",
        json={"isbn": "9784444444444"},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 400
    assert "ISBN already exists" in resp.json()["message"]

    # 清理
    client.delete(f"/api/books/{book['id']}", headers=_headers(librarian_token))
    client.delete(f"/api/books/{another['id']}", headers=_headers(librarian_token))


def test_borrow_status_machine_illegal_transitions(client):
    employee_token = _login(client, "employee", "123456")
    librarian_token = _login(client, "librarian", "123456")

    expected_return = (datetime.utcnow() + timedelta(days=7)).isoformat()

    # 构造 pending 记录
    record = client.post(
        "/api/borrows",
        json={"book_id": 1, "expected_return_date": expected_return},
        headers=_headers(employee_token),
    ).json()["data"]

    # pending 不能直接归还
    resp = client.post(
        f"/api/borrows/{record['id']}/return", headers=_headers(librarian_token)
    )
    assert resp.status_code == 400
    assert "Only borrowed books can be returned" in resp.json()["message"]

    # pending 不能直接借出
    resp = client.post(
        f"/api/borrows/{record['id']}/lend", headers=_headers(librarian_token)
    )
    assert resp.status_code == 400
    assert "Only approved borrow requests can be lent" in resp.json()["message"]

    # 审批通过并借出
    client.post(
        f"/api/borrows/{record['id']}/approve", headers=_headers(librarian_token)
    )
    client.post(
        f"/api/borrows/{record['id']}/lend", headers=_headers(librarian_token)
    )

    # borrowed 不能再次审批/拒绝/借出
    resp = client.post(
        f"/api/borrows/{record['id']}/approve", headers=_headers(librarian_token)
    )
    assert resp.status_code == 400
    assert "Only pending borrow requests can be approved" in resp.json()["message"]

    resp = client.post(
        f"/api/borrows/{record['id']}/reject",
        json={"reject_reason": "test"},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 400
    assert "Only pending borrow requests can be rejected" in resp.json()["message"]

    resp = client.post(
        f"/api/borrows/{record['id']}/lend", headers=_headers(librarian_token)
    )
    assert resp.status_code == 400
    assert "Only approved borrow requests can be lent" in resp.json()["message"]

    # 归还
    client.post(
        f"/api/borrows/{record['id']}/return", headers=_headers(librarian_token)
    )

    # returned 不能再次借出/归还/审批/拒绝
    resp = client.post(
        f"/api/borrows/{record['id']}/lend", headers=_headers(librarian_token)
    )
    assert resp.status_code == 400

    resp = client.post(
        f"/api/borrows/{record['id']}/return", headers=_headers(librarian_token)
    )
    assert resp.status_code == 400

    resp = client.post(
        f"/api/borrows/{record['id']}/approve", headers=_headers(librarian_token)
    )
    assert resp.status_code == 400

    resp = client.post(
        f"/api/borrows/{record['id']}/reject",
        json={"reject_reason": "test"},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 400


def test_category_circular_dependency_returns_400(client):
    librarian_token = _login(client, "librarian", "123456")

    parent = client.post(
        "/api/categories",
        json={"name": "循环父分类"},
        headers=_headers(librarian_token),
    ).json()["data"]
    child = client.post(
        "/api/categories",
        json={"name": "循环子分类", "parent_id": parent["id"]},
        headers=_headers(librarian_token),
    ).json()["data"]

    # 不能把自己设为自己的父节点
    resp = client.put(
        f"/api/categories/{parent['id']}",
        json={"parent_id": parent["id"]},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 400
    assert "Cannot set category as its own parent" in resp.json()["message"]

    # 不能把分类移动到自己的子节点下
    resp = client.put(
        f"/api/categories/{parent['id']}",
        json={"parent_id": child["id"]},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 400
    assert "Cannot move category to its descendant" in resp.json()["message"]

    # 清理
    client.delete(
        f"/api/categories/{child['id']}", headers=_headers(librarian_token)
    )
    client.delete(
        f"/api/categories/{parent['id']}", headers=_headers(librarian_token)
    )


def test_lend_with_insufficient_stock_returns_400(client):
    employee_token = _login(client, "employee", "123456")
    librarian_token = _login(client, "librarian", "123456")

    # 创建库存为 1 的图书并发起借阅
    book = client.post(
        "/api/books",
        json={"title": "单库存图书", "isbn": "9786666666666", "stock": 1},
        headers=_headers(librarian_token),
    ).json()["data"]

    expected_return = (datetime.utcnow() + timedelta(days=7)).isoformat()
    record = client.post(
        "/api/borrows",
        json={"book_id": book["id"], "expected_return_date": expected_return},
        headers=_headers(employee_token),
    ).json()["data"]
    client.post(
        f"/api/borrows/{record['id']}/approve", headers=_headers(librarian_token)
    )

    # 将库存手动扣减为 0，模拟 approved 后库存不足
    db = database.SessionLocal()
    try:
        book_in_db = db.query(Book).filter(Book.id == book["id"]).first()
        book_in_db.stock = 0
        db.commit()
    finally:
        db.close()

    resp = client.post(
        f"/api/borrows/{record['id']}/lend", headers=_headers(librarian_token)
    )
    assert resp.status_code == 400
    assert "Book out of stock" in resp.json()["message"]

    # 清理
    db = database.SessionLocal()
    try:
        db.query(BorrowRecord).filter(BorrowRecord.id == record["id"]).delete()
        db.query(Book).filter(Book.id == book["id"]).delete()
        db.commit()
    finally:
        db.close()


def test_expected_return_date_in_past_returns_400(client):
    employee_token = _login(client, "employee", "123456")

    # 过去日期
    past_date = (datetime.utcnow() - timedelta(days=1)).isoformat()
    resp = client.post(
        "/api/borrows",
        json={"book_id": 1, "expected_return_date": past_date},
        headers=_headers(employee_token),
    )
    assert resp.status_code == 400
    assert "Expected return date must be in the future" in resp.json()["message"]

    # 当前时间附近应被拒绝（使用刚过去的时间确保稳定性）
    just_now = (datetime.utcnow() - timedelta(seconds=5)).isoformat()
    resp = client.post(
        "/api/borrows",
        json={"book_id": 1, "expected_return_date": just_now},
        headers=_headers(employee_token),
    )
    assert resp.status_code == 400


def test_export_invalid_type_or_format_returns_400(client):
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


def test_book_not_found_update_and_delete_returns_404(client):
    librarian_token = _login(client, "librarian", "123456")

    resp = client.get("/api/books/99999", headers=_headers(librarian_token))
    assert resp.status_code == 404
    assert "Book not found" in resp.json()["message"]

    resp = client.put(
        "/api/books/99999",
        json={"title": "不存在"},
        headers=_headers(librarian_token),
    )
    assert resp.status_code == 404
    assert "Book not found" in resp.json()["message"]

    resp = client.delete("/api/books/99999", headers=_headers(librarian_token))
    assert resp.status_code == 404
    assert "Book not found" in resp.json()["message"]


def test_mark_notification_read(client):
    employee_token = _login(client, "employee", "123456")

    # 直接在数据库中为员工（user_id=1）创建一条未读消息
    db = database.SessionLocal()
    try:
        notification = Notification(
            user_id=1, message="测试通知", is_read=0
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        notification_id = notification.id
    finally:
        db.close()

    # 未读过滤应能查到
    resp = client.get(
        "/api/notifications?unread_only=true", headers=_headers(employee_token)
    )
    assert resp.status_code == 200
    assert any(n["id"] == notification_id for n in resp.json()["data"]["items"])
    assert resp.json()["data"]["unread_count"] >= 1

    # 标记已读
    resp = client.post(
        f"/api/notifications/{notification_id}/read",
        headers=_headers(employee_token),
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["is_read"] == 1

    # 再次标记不存在的通知应返回 404
    resp = client.post(
        "/api/notifications/99999/read", headers=_headers(employee_token)
    )
    assert resp.status_code == 404
    assert "Notification not found" in resp.json()["message"]


def test_health_check(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["code"] == 0
    assert resp.json()["message"] == "ok"
