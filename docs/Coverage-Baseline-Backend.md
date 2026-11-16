# 后端测试覆盖率基线报告

> 生成日期：2026-08-05  
> 执行命令：`pytest --cov=backend --cov-branch --cov-report=term-missing --cov-report=html:backend/coverage_html backend/tests/`  
> 测试文件：`backend/tests/test_api.py`  
> 用例数量：24 个  
> 测试结果：**24 passed**

---

## 1. 覆盖率总览

| 指标 | 数值 |
|------|------|
| 语句覆盖率 | 90%（1263 / 1399） |
| 分支覆盖率 | 87%（162 / 194） |
| 未覆盖语句 | 136 行 |
| 未覆盖分支 | 32 个分支部分命中 |

---

## 2. 未覆盖文件与函数

### 2.1 未覆盖或覆盖不足的模块

| 文件 | 语句覆盖率 | 分支覆盖率 | 未覆盖行 | 未覆盖分支 |
|------|-----------|-----------|---------|-----------|
| `backend/auth.py` | 94% | 92% | 71-76 | - |
| `backend/config.py` | 93% | 90% | 19, 45 | 45 |
| `backend/init_db.py` | 67% | - | 15-19, 42, 52-58, 70, 84, 107, 144, 151-175, 179 | 31→35 |
| `backend/main.py` | 76% | 70% | 69, 77-81, 89-90, 111-112, 144-153 | 89→90 |
| `backend/routers/books.py` | 74% | 72% | 50-52, 132, 171-173, 210-252 | 164→170 |
| `backend/routers/borrows.py` | 91% | 86% | 51, 88-91, 129, 155, 181, 214 | 116→118 |
| `backend/routers/categories.py` | 88% | 84% | 49-52, 74, 102, 125-133, 148 | 28→22, 42→41 |
| `backend/routers/statistics.py` | 91% | 87% | 112-117, 204-205 | 146→150 |
| `backend/scheduler.py` | 65% | 62% | 25, 39, 43, 56, 63-66, 80-83, 86, 91-97, 102-109 | - |
| `backend/schemas.py` | 99% | 99% | - | 146→150 |

### 2.2 已完全覆盖的模块

- `backend/database.py`（100%）
- `backend/models.py`（100%）
- `backend/routers/__init__.py`（100%）
- `backend/routers/auth.py`（100%）
- `backend/routers/notifications.py`（100%）
- `backend/routers/overdue.py`（100%）
- `backend/tests/__init__.py`（100%）
- `backend/tests/conftest.py`（100%）
- `backend/tests/test_api.py`（100%）

---

## 3. 未覆盖代码行与分支明细

### 3.1 `backend/auth.py`

| 行号 | 代码 | 缺失场景 |
|------|------|---------|
| 71-76 | `require_role` 装饰器 | 员工访问要求 `librarian`/`admin` 角色的接口，返回 403 |

### 3.2 `backend/config.py`

| 行号 | 代码 | 缺失场景 |
|------|------|---------|
| 19 | `_generate_secret_key` | 未显式触发默认工厂 |
| 45 | `logger.warning` | 未设置 `SECRET_KEY` 时的警告分支 |

### 3.3 `backend/init_db.py`

| 行号 | 代码 | 缺失场景 |
|------|------|---------|
| 15-19 | `migrate_db` | 数据库迁移补充字段逻辑 |
| 42 | `_generate_initial_password` | 生成随机密码 |
| 52-58 | `_get_initial_password` | 环境变量未设置时的随机密码与警告 |
| 70 | `init_users` | 用户已存在跳过 |
| 84 | `init_categories` | 分类已存在跳过 |
| 107 | `init_books` | 图书已存在跳过 |
| 144 | `init_books` | 分类缺失回退 |
| 151-175, 179 | `main()` | 完整初始化流程 |
| 31→35 | `init_roles` | 角色已存在分支 |

### 3.4 `backend/main.py`

| 行号 | 代码 | 缺失场景 |
|------|------|---------|
| 69 | HSTS 头 | `https` 请求场景 |
| 77-81 | 全局 500 异常 DEBUG 详情 | 触发未捕获异常 |
| 89-90 | 参数校验异常处理 | 请求参数类型错误（422） |
| 111-112 | SQLAlchemyError 处理 | 数据库异常 |
| 144-153 | 封面静态文件服务 | 访问已上传封面 |

### 3.5 `backend/routers/books.py`

| 行号 | 代码 | 缺失场景 |
|------|------|---------|
| 50-52 | `_get_descendant_ids` 递归子分类 | 按父分类搜索包含子孙分类 |
| 132 | 创建图书分类不存在 | `category_id` 不存在返回 400 |
| 171-173 | 更新图书分类不存在 | `category_id` 不存在返回 400 |
| 210-252 | 封面上传 | 合法图片上传、非图片文件、超大文件 |
| 164→170 | ISBN 校验分支 | 更新时 `category_id` 同时变更 |

### 3.6 `backend/routers/borrows.py`

| 行号 | 代码 | 缺失场景 |
|------|------|---------|
| 51 | 借阅图书不存在 | `book_id` 不存在返回 404 |
| 88-91 | 我的借阅状态过滤 | `GET /api/borrows/my?status=pending` |
| 129 | 审核记录不存在 | `borrow_id` 不存在返回 404 |
| 155 | 拒绝记录不存在 | `borrow_id` 不存在返回 404 |
| 181 | 借出记录不存在 | `borrow_id` 不存在返回 404 |
| 214 | 归还记录不存在 | `borrow_id` 不存在返回 404 |
| 116→118 | 通用列表状态过滤 | 多 `status` 参数过滤分支 |

### 3.7 `backend/routers/categories.py`

| 行号 | 代码 | 缺失场景 |
|------|------|---------|
| 49-52 | `_update_category_path` | 移动父节点后子分类 path 递归更新 |
| 74 | 创建分类父节点不存在 | `parent_id` 不存在返回 400 |
| 102 | 更新分类不存在 | `category_id` 不存在返回 404 |
| 125-133 | 更新分类循环依赖/父节点不存在 | 自引用、移动到子节点、父节点不存在 |
| 148 | 删除分类不存在 | `category_id` 不存在返回 404 |
| 28→22 | `_build_category_tree` | 父节点缺失分支 |
| 42→41 | `_get_descendant_ids` | 子分类已访问分支 |

### 3.8 `backend/routers/statistics.py`

| 行号 | 代码 | 缺失场景 |
|------|------|---------|
| 112-117 | `_rows_for_type` 部门/个人导出 | 部门为空显示 `"未设置部门"` |
| 204-205 | `openpyxl` 未安装 | Excel 导出异常分支 |

### 3.9 `backend/scheduler.py`

| 行号 | 代码 | 缺失场景 |
|------|------|---------|
| 25 | 自动创建 SessionLocal | 无参调用 `check_and_create_notifications` |
| 39 | 缺少预计归还日期 | `expected_return_date` 为 None |
| 43 | 到期前 >3 天 | 不生成通知 |
| 56 | 同一天不重复生成 | 已存在当天通知 |
| 63-66 | 到期前 3 天内/当天消息 | 消息文本包含 `"将在"` / `"今天到期"` |
| 80-83, 86 | 异常回滚 | commit 抛异常时回滚并关闭 db |
| 91-97, 102-109 | 后台调度循环 | `_scheduler_loop` / `start_scheduler` |

### 3.10 `backend/schemas.py`

| 分支 | 代码 | 缺失场景 |
|------|------|---------|
| 146→150 | `BorrowRecordOut.compute_overdue_days` | `expected_return_date` 为 None 分支 |

---

## 4. 核心业务覆盖率缺口

| 业务模块 | 当前语句覆盖率 | 目标 | 主要缺口 |
|----------|--------------|------|---------|
| 图书管理（books） | 74% | ≥95% | 分类递归搜索、分类不存在、封面上传 |
| 借阅管理（borrows） | 91% | ≥95% | 资源不存在 404、我的列表状态过滤 |
| 分类管理（categories） | 88% | ≥95% | path 递归更新、父节点不存在、循环依赖 |
| 统计导出（statistics） | 91% | ≥95% | 空部门/用户导出、Excel 导出异常 |
| 定时任务（scheduler） | 65% | ≥90% | 多日期边界、异常回滚、去重 |

---

## 5. 补充测试计划

1. **异常与权限**：覆盖 401/403/404/400 全部分支，包括 Token 过期、非法 Token、无权限访问 `/me`。
2. **图书模块**：补充分类递归搜索、创建/更新分类不存在、封面上传（真实图片/非图片/超大文件）。
3. **分类模块**：补充 path 递归更新、循环依赖、父节点不存在、删除不存在。
4. **借阅模块**：补充我的列表状态过滤、各操作 404、状态机非法转换已部分覆盖，继续完善。
5. **通知模块**：已覆盖列表与已读，保持。
6. **统计模块**：补充部门/用户为空导出、非法参数。
7. **定时任务**：补充即将到期、当天到期、缺少归还日期、同一天去重、异常回滚。
8. **全局异常**：补充 422、500、数据库异常处理。
