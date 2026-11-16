"""用户管理与角色权限管理 API 测试。"""

import pytest


def _login(client, username, password):
    resp = client.post(
        "/api/auth/login",
        data={"username": username, "password": password},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["access_token"]


def _headers(token):
    return {"Authorization": f"Bearer {token}"}


def _get_role_map(client, token):
    resp = client.get("/api/roles", headers=_headers(token))
    assert resp.status_code == 200
    return {r["name"]: r["id"] for r in resp.json()["data"]["items"]}


def _create_user(client, token, **kwargs):
    payload = {
        "username": "newuser",
        "password": "password123",
        "role_id": _get_role_map(client, token)["employee"],
        "department": "测试部",
    }
    payload.update(kwargs)
    resp = client.post("/api/users", json=payload, headers=_headers(token))
    return resp


# -----------------------------------------------------------------------------
# 用户管理接口测试
# -----------------------------------------------------------------------------


def test_user_list_pagination_and_filters(client):
    admin_token = _login(client, "admin", "123456")
    role_map = _get_role_map(client, admin_token)

    # 创建两个测试用户
    _create_user(client, admin_token, username="user_alpha", department="研发部")
    _create_user(client, admin_token, username="user_beta", department="测试部")

    # 默认分页
    resp = client.get("/api/users", headers=_headers(admin_token))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "items" in data
    assert "pagination" in data
    assert data["pagination"]["page"] == 1

    # 按用户名搜索
    resp = client.get("/api/users?keyword=alpha", headers=_headers(admin_token))
    assert resp.status_code == 200
    items = resp.json()["data"]["items"]
    assert any(u["username"] == "user_alpha" for u in items)

    # 按部门搜索
    resp = client.get("/api/users?keyword=测试部", headers=_headers(admin_token))
    assert resp.status_code == 200
    items = resp.json()["data"]["items"]
    assert any(u["username"] == "user_beta" for u in items)

    # 按角色过滤
    resp = client.get(
        f"/api/users?role_id={role_map['employee']}", headers=_headers(admin_token)
    )
    assert resp.status_code == 200
    items = resp.json()["data"]["items"]
    assert all(u["role_id"] == role_map["employee"] for u in items)

    # page_size 边界
    resp = client.get("/api/users?page=1&page_size=2", headers=_headers(admin_token))
    assert resp.status_code == 200
    assert len(resp.json()["data"]["items"]) <= 2


def test_user_crud(client):
    admin_token = _login(client, "admin", "123456")
    role_map = _get_role_map(client, admin_token)

    # 创建用户
    resp = _create_user(
        client,
        admin_token,
        username="crud_user",
        role_id=role_map["employee"],
        department="技术部",
    )
    assert resp.status_code == 200
    user = resp.json()["data"]
    assert user["username"] == "crud_user"
    assert user["department"] == "技术部"
    assert user["is_active"] is True
    user_id = user["id"]

    # 查询详情
    resp = client.get(f"/api/users/{user_id}", headers=_headers(admin_token))
    assert resp.status_code == 200
    assert resp.json()["data"]["username"] == "crud_user"

    # 更新用户
    resp = client.put(
        f"/api/users/{user_id}",
        json={"department": "更新后的部门", "is_active": False},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["department"] == "更新后的部门"
    assert data["is_active"] is False

    # 删除用户
    resp = client.delete(f"/api/users/{user_id}", headers=_headers(admin_token))
    assert resp.status_code == 200

    # 删除后查询 404
    resp = client.get(f"/api/users/{user_id}", headers=_headers(admin_token))
    assert resp.status_code == 404
    assert "User not found" in resp.json()["message"]


def test_user_update_password(client):
    admin_token = _login(client, "admin", "123456")

    resp = _create_user(client, admin_token, username="pwd_user")
    assert resp.status_code == 200
    user_id = resp.json()["data"]["id"]

    # 更新密码
    resp = client.put(
        f"/api/users/{user_id}",
        json={"password": "new_password_456"},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 200

    # 使用新密码登录
    token = _login(client, "pwd_user", "new_password_456")
    assert token


def test_user_status_update(client):
    admin_token = _login(client, "admin", "123456")

    resp = _create_user(client, admin_token, username="status_user")
    assert resp.status_code == 200
    user_id = resp.json()["data"]["id"]

    # 禁用
    resp = client.patch(
        f"/api/users/{user_id}/status",
        json={"is_active": False},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["is_active"] is False

    # 禁用后无法登录
    resp = client.post(
        "/api/auth/login",
        data={"username": "status_user", "password": "password123"},
    )
    assert resp.status_code == 403
    assert "disabled" in resp.json()["message"]

    # 重新启用
    resp = client.patch(
        f"/api/users/{user_id}/status",
        json={"is_active": True},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["is_active"] is True

    # 启用后可以登录
    token = _login(client, "status_user", "password123")
    assert token


def test_user_batch_status_update(client):
    admin_token = _login(client, "admin", "123456")

    resp1 = _create_user(client, admin_token, username="batch_user_1")
    resp2 = _create_user(client, admin_token, username="batch_user_2")
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    ids = [resp1.json()["data"]["id"], resp2.json()["data"]["id"]]

    # 批量禁用
    resp = client.patch(
        "/api/users/batch/status",
        json={"ids": ids, "is_active": False},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["updated"] == 2
    assert data["not_found"] == []

    # 验证状态
    for user_id in ids:
        resp = client.get(f"/api/users/{user_id}", headers=_headers(admin_token))
        assert resp.json()["data"]["is_active"] is False

    # 包含不存在 ID 的批量启用
    resp = client.patch(
        "/api/users/batch/status",
        json={"ids": [ids[0], 99999], "is_active": True},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["updated"] == 1
    assert 99999 in data["not_found"]


def test_user_delete_constraints(client):
    admin_token = _login(client, "admin", "123456")
    admin_id = client.get("/api/auth/me", headers=_headers(admin_token)).json()["data"]["id"]

    # 不能删除当前登录用户
    resp = client.delete(f"/api/users/{admin_id}", headers=_headers(admin_token))
    assert resp.status_code == 400
    assert "Cannot delete current user" in resp.json()["message"]

    # 创建第二个管理员，以便删除原管理员时不是最后一个 admin
    role_map = _get_role_map(client, admin_token)
    resp = _create_user(
        client,
        admin_token,
        username="another_admin",
        role_id=role_map["admin"],
        password="admin123",
    )
    assert resp.status_code == 200
    another_admin_id = resp.json()["data"]["id"]

    # 用新管理员登录，删除原管理员应成功
    another_token = _login(client, "another_admin", "admin123")
    resp = client.delete(f"/api/users/{admin_id}", headers=_headers(another_token))
    assert resp.status_code == 200

    # 现在只剩一个 admin（another_admin），删除自己应被阻止
    resp = client.delete(
        f"/api/users/{another_admin_id}", headers=_headers(another_token)
    )
    assert resp.status_code == 400


def test_user_permission_check(client):
    employee_token = _login(client, "employee", "123456")
    librarian_token = _login(client, "librarian", "123456")

    for token in (employee_token, librarian_token):
        resp = client.get("/api/users", headers=_headers(token))
        assert resp.status_code == 403

        resp = client.post(
            "/api/users",
            json={"username": "hacker", "password": "123", "role_id": 1},
            headers=_headers(token),
        )
        assert resp.status_code == 403


def test_user_username_uniqueness(client):
    admin_token = _login(client, "admin", "123456")

    resp = _create_user(client, admin_token, username="unique_user")
    assert resp.status_code == 200

    # 重复用户名创建失败
    resp = _create_user(client, admin_token, username="unique_user")
    assert resp.status_code == 400
    assert "Username already exists" in resp.json()["message"]

    # 创建另一个用户，更新为重复用户名失败
    resp = _create_user(client, admin_token, username="another_unique")
    assert resp.status_code == 200
    another_id = resp.json()["data"]["id"]

    resp = client.put(
        f"/api/users/{another_id}",
        json={"username": "unique_user"},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 400
    assert "Username already exists" in resp.json()["message"]


def test_user_update_role_not_found(client):
    admin_token = _login(client, "admin", "123456")

    resp = _create_user(client, admin_token, username="role_check_user")
    assert resp.status_code == 200
    user_id = resp.json()["data"]["id"]

    resp = client.put(
        f"/api/users/{user_id}",
        json={"role_id": 99999},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 400
    assert "Role not found" in resp.json()["message"]


def test_user_not_found(client):
    admin_token = _login(client, "admin", "123456")

    resp = client.get("/api/users/99999", headers=_headers(admin_token))
    assert resp.status_code == 404
    assert "User not found" in resp.json()["message"]

    resp = client.put(
        "/api/users/99999",
        json={"department": "x"},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 404

    resp = client.delete("/api/users/99999", headers=_headers(admin_token))
    assert resp.status_code == 404

    resp = client.patch(
        "/api/users/99999/status",
        json={"is_active": False},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 404


# -----------------------------------------------------------------------------
# 角色权限管理接口测试
# -----------------------------------------------------------------------------


def test_role_list_pagination_and_search(client):
    admin_token = _login(client, "admin", "123456")

    resp = client.get("/api/roles", headers=_headers(admin_token))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data["items"]) >= 3
    assert data["pagination"]["total"] >= 3

    # 按名称搜索
    resp = client.get("/api/roles?keyword=admin", headers=_headers(admin_token))
    assert resp.status_code == 200
    items = resp.json()["data"]["items"]
    assert any(r["name"] == "admin" for r in items)

    # 按描述搜索
    resp = client.get("/api/roles?keyword=系统管理员", headers=_headers(admin_token))
    assert resp.status_code == 200
    items = resp.json()["data"]["items"]
    assert any(r["name"] == "admin" for r in items)


def test_role_crud(client):
    admin_token = _login(client, "admin", "123456")

    # 创建角色
    resp = client.post(
        "/api/roles",
        json={
            "name": "test_role",
            "description": "测试角色",
            "permissions": ["book:read"],
        },
        headers=_headers(admin_token),
    )
    assert resp.status_code == 200
    role = resp.json()["data"]
    assert role["name"] == "test_role"
    role_id = role["id"]

    # 查询详情
    resp = client.get(f"/api/roles/{role_id}", headers=_headers(admin_token))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["name"] == "test_role"
    assert data["user_count"] == 0
    assert data["users"] == []

    # 更新角色
    resp = client.put(
        f"/api/roles/{role_id}",
        json={"description": "更新后的描述", "permissions": ["book:read", "book:write"]},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["description"] == "更新后的描述"
    assert set(data["permissions"]) == {"book:read", "book:write"}

    # 删除角色
    resp = client.delete(f"/api/roles/{role_id}", headers=_headers(admin_token))
    assert resp.status_code == 200

    resp = client.get(f"/api/roles/{role_id}", headers=_headers(admin_token))
    assert resp.status_code == 404


def test_role_delete_constraints(client):
    admin_token = _login(client, "admin", "123456")
    role_map = _get_role_map(client, admin_token)

    # 不能删除系统预设角色
    for role_name in ("employee", "librarian", "admin"):
        resp = client.delete(
            f"/api/roles/{role_map[role_name]}", headers=_headers(admin_token)
        )
        assert resp.status_code == 400
        assert "Cannot delete system role" in resp.json()["message"]

    # 创建新角色并关联用户，删除应失败
    resp = client.post(
        "/api/roles",
        json={"name": "role_with_user", "permissions": []},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 200
    role_id = resp.json()["data"]["id"]

    resp = _create_user(
        client, admin_token, username="role_bound_user", role_id=role_id
    )
    assert resp.status_code == 200

    resp = client.delete(f"/api/roles/{role_id}", headers=_headers(admin_token))
    assert resp.status_code == 400
    assert "Cannot delete role with associated users" in resp.json()["message"]


def test_role_users(client):
    admin_token = _login(client, "admin", "123456")
    role_map = _get_role_map(client, admin_token)
    employee_role_id = role_map["employee"]

    # 创建员工用户
    resp = _create_user(
        client, admin_token, username="role_employee_user", role_id=employee_role_id
    )
    assert resp.status_code == 200

    resp = client.get(
        f"/api/roles/{employee_role_id}/users", headers=_headers(admin_token)
    )
    assert resp.status_code == 200
    users = resp.json()["data"]
    assert any(u["username"] == "role_employee_user" for u in users)


def test_role_permissions_update(client):
    admin_token = _login(client, "admin", "123456")

    resp = client.post(
        "/api/roles",
        json={"name": "perm_role", "permissions": ["a:b"]},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 200
    role_id = resp.json()["data"]["id"]

    resp = client.put(
        f"/api/roles/{role_id}/permissions",
        json={"permissions": ["x:read", "x:write"]},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert set(data["permissions"]) == {"x:read", "x:write"}

    # 查询详情确认权限已更新
    resp = client.get(f"/api/roles/{role_id}", headers=_headers(admin_token))
    assert resp.status_code == 200
    assert set(resp.json()["data"]["permissions"]) == {"x:read", "x:write"}


def test_role_name_uniqueness(client):
    admin_token = _login(client, "admin", "123456")

    resp = client.post(
        "/api/roles",
        json={"name": "dup_role", "permissions": []},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 200

    resp = client.post(
        "/api/roles",
        json={"name": "dup_role", "permissions": []},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 400
    assert "Role name already exists" in resp.json()["message"]


def test_role_permission_check(client):
    employee_token = _login(client, "employee", "123456")
    librarian_token = _login(client, "librarian", "123456")

    for token in (employee_token, librarian_token):
        resp = client.get("/api/roles", headers=_headers(token))
        assert resp.status_code == 403

        resp = client.post(
            "/api/roles",
            json={"name": "hacker_role", "permissions": []},
            headers=_headers(token),
        )
        assert resp.status_code == 403


def test_role_not_found(client):
    admin_token = _login(client, "admin", "123456")

    resp = client.get("/api/roles/99999", headers=_headers(admin_token))
    assert resp.status_code == 404
    assert "Role not found" in resp.json()["message"]

    resp = client.put(
        "/api/roles/99999",
        json={"description": "x"},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 404

    resp = client.delete("/api/roles/99999", headers=_headers(admin_token))
    assert resp.status_code == 404

    resp = client.get("/api/roles/99999/users", headers=_headers(admin_token))
    assert resp.status_code == 404

    resp = client.put(
        "/api/roles/99999/permissions",
        json={"permissions": []},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 404
