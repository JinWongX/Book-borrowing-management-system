# 企业图书借阅管理系统 - 单元测试覆盖度核查报告

> 版本：v1.0  
> 日期：2026-07-31  
> 状态：已核查

---

## 1. 测试执行汇总

### 1.1 后端测试

- **执行命令**：`pytest backend/tests/ -v`
- **测试文件**：`backend/tests/test_api.py`
- **用例总数**：12
- **通过数量**：12
- **失败数量**：0
- **通过率**：100%
- **覆盖率**（`pytest --cov=backend backend/tests/ --cov-report=term-missing`）：

| 模块 | 语句数 | 未覆盖 | 覆盖率 |
|------|--------|--------|--------|
| backend/auth.py | 51 | 8 | 84% |
| backend/config.py | 15 | 0 | 100% |
| backend/database.py | 11 | 0 | 100% |
| backend/init_db.py | 83 | 28 | 66% |
| backend/main.py | 52 | 7 | 87% |
| backend/models.py | 76 | 0 | 100% |
| backend/routers/auth.py | 19 | 0 | 100% |
| backend/routers/books.py | 103 | 22 | 79% |
| backend/routers/borrows.py | 90 | 15 | 83% |
| backend/routers/categories.py | 97 | 30 | 69% |
| backend/routers/notifications.py | 29 | 8 | 72% |
| backend/routers/overdue.py | 17 | 0 | 100% |
| backend/routers/statistics.py | 92 | 9 | 90% |
| backend/scheduler.py | 62 | 22 | 65% |
| backend/schemas.py | 122 | 0 | 100% |
| **TOTAL** | **1147** | **149** | **87%** |

### 1.2 前端测试

- **执行命令**：`cd frontend && npm run test`
- **测试文件**：`frontend/src/utils/menu.test.js`
- **用例总数**：5
- **通过数量**：5
- **失败数量**：0
- **通过率**：100%
- **覆盖率工具**：未配置 `c8`/`@vitest/coverage-v8`，当前仅验证工具函数逻辑正确性。

---

## 2. 已覆盖的功能模块

### 2.1 后端已覆盖模块

| 模块 | 覆盖点 | 对应测试函数 |
|------|--------|--------------|
| **认证（auth）** | 登录成功、登录失败（401）、获取当前用户 | `test_login_success`、`test_login_failure` |
| **分类管理（categories）** | 列表查看、创建/更新/删除、员工越权（403）、子分类约束、图书关联约束 | `test_category_crud_permission`、`test_category_delete_constraints` |
| **图书管理（books）** | 创建/更新/删除、员工越权（403）、ISBN 唯一性校验、关键词/ISBN/分类搜索 | `test_book_crud_and_isbn_uniqueness`、`test_book_search` |
| **借阅流程（borrows）** | 申请、审核通过、审核拒绝、借出登记、归还登记、库存联动 | `test_borrow_full_flow`、`test_borrow_reject`、`test_borrow_out_of_stock` |
| **逾期提醒（overdue/scheduler）** | 逾期提醒生成、消息中心查询、管理员逾期列表 | `test_overdue_notification_generation` |
| **统计报表（statistics）** | 图书/分类/部门/个人/Top20 统计、员工越权（403）、CSV/Excel 导出 | `test_statistics_endpoints`、`test_export_csv_and_excel` |

### 2.2 前端已覆盖模块

| 模块 | 覆盖点 | 对应测试文件 |
|------|--------|--------------|
| **菜单工具函数（menu.js）** | 按角色过滤菜单、非法角色返回空数组、菜单 key 唯一性 | `frontend/src/utils/menu.test.js` |

---

## 3. 未覆盖的功能模块与代码区域

### 3.1 后端未覆盖/覆盖不足的模块

#### 3.1.1 图书管理（`backend/routers/books.py`）

覆盖率：**79%**，未覆盖行：`37-39, 96, 119, 140, 158-160, 182, 197-215`

| 未覆盖代码区域 | 行号 | 缺失场景 | 需补充测试 |
|--------------|------|----------|-----------|
| 分类筛选递归获取子分类 | 37-39 | 分类树存在多层嵌套时，图书按分类搜索是否包含所有子孙分类 | 构造三级分类并验证 `category_id=父分类` 能检索到孙分类图书 |
| 查询单本图书不存在 | 96 | `GET /api/books/{book_id}` 访问不存在的图书 | 请求 `book_id=99999`，断言返回 404 及 `"Book not found"` |
| 创建图书时分类不存在 | 119 | `POST /api/books` 传入不存在的 `category_id` | 断言返回 400 及 `"Category not found"` |
| 更新图书不存在 | 140 | `PUT /api/books/{book_id}` 更新不存在的图书 | 断言返回 404 及 `"Book not found"` |
| 更新图书时分类不存在 | 158-160 | `PUT /api/books/{book_id}` 传入不存在的 `category_id` | 断言返回 400 及 `"Category not found"` |
| 删除图书不存在 | 182 | `DELETE /api/books/{book_id}` 删除不存在的图书 | 断言返回 404 及 `"Book not found"` |
| 封面上传 | 197-215 | 上传合法封面图、上传非法格式文件 | 构造合法/非法 `UploadFile`，断言 200 返回 URL 或 400 `"Invalid image format"` |

#### 3.1.2 借阅管理（`backend/routers/borrows.py`）

覆盖率：**83%**，未覆盖行：`51, 63, 88-91, 113, 119, 139, 145, 165, 171, 177, 198, 204`

| 未覆盖代码区域 | 行号 | 缺失场景 | 需补充测试 |
|--------------|------|----------|-----------|
| 借阅申请图书不存在 | 51 | `POST /api/borrows` 传入不存在的 `book_id` | 断言返回 404 及 `"Book not found"` |
| 借阅申请归还日期不合法 | 63 | 预计归还日期早于或等于当前时间 | 传入 `datetime.utcnow() - timedelta(days=1)`，断言返回 400 |
| 我的借阅列表状态过滤 | 88-91 | `GET /api/borrows/my?status=pending` | 断言返回记录状态均等于过滤值 |
| 审核通过时记录不存在 | 113 | `POST /api/borrows/{id}/approve` 传入不存在 ID | 断言返回 404 |
| 审核通过时状态非法 | 119 | 对非 pending 记录执行 approve | 构造 approved 记录，断言返回 400 |
| 拒绝时记录不存在 | 139 | `POST /api/borrows/{id}/reject` 传入不存在 ID | 断言返回 404 |
| 拒绝时状态非法 | 145 | 对非 pending 记录执行 reject | 构造 borrowed 记录，断言返回 400 |
| 借出时记录不存在 | 165 | `POST /api/borrows/{id}/lend` 传入不存在 ID | 断言返回 404 |
| 借出时状态非法 | 171 | 对非 approved 记录执行 lend | 构造 pending 记录，断言返回 400 |
| 借出时库存不足 | 177 | approved 记录在 lend 时库存为 0 | 将图书 stock 改为 0，断言返回 400 |
| 归还时记录不存在 | 198 | `POST /api/borrows/{id}/return` 传入不存在 ID | 断言返回 404 |
| 归还时状态非法 | 204 | 对非 borrowed 记录执行 return | 构造 approved 记录，断言返回 400 |

#### 3.1.3 分类管理（`backend/routers/categories.py`）

覆盖率：**69%**，未覆盖行：`34-45, 49-52, 74, 102, 111-133, 148`

| 未覆盖代码区域 | 行号 | 缺失场景 | 需补充测试 |
|--------------|------|----------|-----------|
| 分类树构建 | 34-45 | 多级分类树渲染 | 验证 `_build_category_tree` 对含子分类的数据返回正确树结构 |
| 递归更新分类 path | 49-52 | 移动分类父节点后，子分类 path 同步更新 | 构造父-子-孙分类，更新父分类 parent_id，断言子孙 path 均更新 |
| 创建分类父节点不存在 | 74 | `POST /api/categories` 传入不存在的 `parent_id` | 断言返回 400 及 `"Parent category not found"` |
| 更新分类不存在 | 102 | `PUT /api/categories/{id}` 更新不存在 ID | 断言返回 404 |
| 更新分类循环依赖 | 111-133 | 设置自己为父节点、移动到子节点下、父节点不存在 | 断言返回 400 及 `"Cannot set category as its own parent"`、`"Cannot move category to its descendant"`、`"Parent category not found"` |
| 删除分类不存在 | 148 | `DELETE /api/categories/{id}` 删除不存在 ID | 断言返回 404 |

#### 3.1.4 消息通知（`backend/routers/notifications.py`）

覆盖率：**72%**，未覆盖行：`25, 66-80`

| 未覆盖代码区域 | 行号 | 缺失场景 | 需补充测试 |
|--------------|------|----------|-----------|
| 仅未读过滤 | 25 | `GET /api/notifications?unread_only=true` | 创建已读/未读消息各一条，断言只返回未读 |
| 标记消息已读 | 66-80 | `POST /api/notifications/{id}/read` | 断言消息 `is_read` 变为 1；读取不存在的消息返回 404 |

#### 3.1.5 统计导出（`backend/routers/statistics.py`）

覆盖率：**90%**，未覆盖行：`112-117, 174, 198-199`

| 未覆盖代码区域 | 行号 | 缺失场景 | 需补充测试 |
|--------------|------|----------|-----------|
| 部门/个人统计空值处理 | 112-117 | 用户未设置部门或名称为空 | 构造 department 为空的用户借阅记录，验证 `"未设置部门"` 显示 |
| 导出类型非法 | 174 | `GET /api/statistics/export?type=invalid&format=csv` | 断言返回 400 及 `"Invalid statistics type"` |
| openpyxl 未安装异常 | 198-199 | 导出 Excel 但环境缺少 openpyxl | 通过 mock 模拟 ImportError，断言返回 500（低优先级） |

#### 3.1.6 认证与权限（`backend/auth.py`）

覆盖率：**84%**，未覆盖行：`40-41, 56, 60, 64, 71-76`

| 未覆盖代码区域 | 行号 | 缺失场景 | 需补充测试 |
|--------------|------|----------|-----------|
| Token 解码失败 | 40-41 | `decode_access_token` 对无效/过期 Token 返回 None | 直接调用函数验证 JWTError 分支 |
| 缺少 sub 字段 | 56, 60 | Token payload 无 sub | 构造无 sub 的 JWT，访问受保护接口返回 401 |
| 用户不存在 | 64 | Token 对应用户已被删除 | 断言返回 401 |
| 角色校验 | 71-76 | `require_role` 要求特定角色 | 员工访问仅管理员接口返回 403 |

#### 3.1.7 全局异常处理（`backend/main.py`）

覆盖率：**87%**，未覆盖行：`45-46, 54-55, 76-77, 85`

| 未覆盖代码区域 | 行号 | 缺失场景 | 需补充测试 |
|--------------|------|----------|-----------|
| 全局 500 异常 | 45-46 | 触发未捕获异常 | 通过 monkeypatch 让某路由抛出普通 Exception，断言返回 500 |
| 参数校验异常 | 54-55 | 请求参数类型错误（422） | 传入非法日期格式，断言返回 422 及字段错误详情 |
| 数据库异常 | 76-77 | SQLAlchemy 错误 | 通过 monkeypatch 让查询抛出 SQLAlchemyError，断言返回 500 |
| 健康检查 | 85 | `GET /health` | 断言返回 `{"code": 0, "message": "ok"}` |

#### 3.1.8 定时任务（`backend/scheduler.py`）

覆盖率：**65%**，未覆盖行：`25, 39, 43, 56, 63-66, 80-83, 86, 91-97, 102-109`

| 未覆盖代码区域 | 行号 | 缺失场景 | 需补充测试 |
|--------------|------|----------|-----------|
| 自动创建 SessionLocal | 25 | `check_and_create_notifications()` 无参调用 | 已在 `test_overdue_notification_generation` 显式传参，需补充无参调用并断言不报错 |
| 缺少预计归还日期 | 39 | 借阅记录 `expected_return_date` 为 None | 构造该记录，断言跳过不生成通知 |
| 到期前 >3 天不生成 | 43 | 归还日期在 4 天后 | 断言不生成通知 |
| 同一天不重复生成 | 56 | 当天已为同一条记录生成过通知 | 再次调用任务，断言 `created_count == 0` |
| 即将到期/当天到期消息 | 63-66 | 到期前 3 天内及当天 | 构造对应日期记录，断言消息文本包含 `"将在"` 或 `"今天到期"` |
| 异常回滚 | 80-83, 86 | 任务执行异常时回滚并关闭 db | 通过 monkeypatch 让 commit 抛异常，断言函数抛出且不泄漏连接 |
| 后台调度循环 | 91-97, 102-109 | `_scheduler_loop` / `start_scheduler` | 启动线程并验证守护线程名，低优先级 |

#### 3.1.9 数据库初始化（`backend/init_db.py`）

覆盖率：**66%**，未覆盖行：`13-17, 47, 60, 83, 120, 127-151, 155`

| 未覆盖代码区域 | 行号 | 缺失场景 | 需补充测试 |
|--------------|------|----------|-----------|
| 初始化函数边界 | 多处 | 角色/用户/分类/图书初始化时的缺失字段回退逻辑 | 建议在集成测试中直接调用 `init_db.main()` 验证生产库初始化流程 |

### 3.2 前端未覆盖模块

| 模块/文件 | 当前状态 | 需补充测试 |
|-----------|----------|-----------|
| `src/utils/menu.js` | 已覆盖 `getMenuByRole`、`MENU_ITEMS` | 无 |
| `src/services/auth.js` | 未测试 | 登录/登出/localStorage 读写、Token 注入 |
| `src/services/request.js` | 未测试 | Axios 拦截器、401 跳转、统一错误提示 |
| `src/contexts/AuthContext.jsx` | 未测试 | 登录状态、角色获取、登出逻辑 |
| `src/hooks/useAuth.js` | 未测试 | Hook 返回值与上下文交互 |
| `src/components/Layout.jsx` | 未测试 | 菜单渲染、退出登录、路由跳转 |
| `src/components/PrivateRoute.jsx` | 未测试 | 未登录重定向、角色鉴权 |
| `src/pages/*.jsx` | 未测试 | 各页面核心交互（表单提交、表格分页、弹窗确认等） |

---

## 4. 核心代码分支覆盖情况

### 4.1 正常分支

| 功能 | 覆盖情况 | 说明 |
|------|----------|------|
| 登录成功 | ✅ 已覆盖 | `test_login_success` |
| 分类 CRUD | ✅ 已覆盖 | `test_category_crud_permission` |
| 图书 CRUD | ✅ 已覆盖 | `test_book_crud_and_isbn_uniqueness` |
| 借阅申请→审核→借出→归还 | ✅ 已覆盖 | `test_borrow_full_flow` |
| 统计各维度查询 | ✅ 已覆盖 | `test_statistics_endpoints` |
| 导出 CSV/Excel | ✅ 已覆盖 | `test_export_csv_and_excel` |
| 逾期提醒生成 | ✅ 已覆盖 | `test_overdue_notification_generation` |

### 4.2 异常分支

| 功能 | 覆盖情况 | 缺失说明 |
|------|----------|----------|
| 登录失败 401 | ✅ 已覆盖 | `test_login_failure` |
| 未登录/无效 Token 401 | ⚠️ 部分覆盖 | 缺少显式空 Token、过期 Token、用户删除场景 |
| 越权访问 403 | ✅ 已覆盖 | 员工访问管理员接口已覆盖 |
| 资源不存在 404 | ❌ 未系统覆盖 | 图书/分类/借阅单/通知单不存在场景均未覆盖 |
| 参数校验 400/422 | ⚠️ 部分覆盖 | ISBN 重复、库存为 0、分类约束已覆盖；缺少日期非法、分类不存在、状态非法 |
| 导出类型非法 400 | ❌ 未覆盖 | `type=invalid` 场景未覆盖 |
| 服务器内部错误 500 | ❌ 未覆盖 | 全局异常、数据库异常未覆盖 |

### 4.3 边界条件

| 功能 | 覆盖情况 | 缺失说明 |
|------|----------|----------|
| 库存为 0 禁止申请 | ✅ 已覆盖 | `test_borrow_out_of_stock` |
| 借出时库存为 0 | ❌ 未覆盖 | approved 后库存被其他流程扣减为 0 的场景 |
| 预计归还日期为未来日期 | ✅ 已覆盖 | 正常流程使用未来日期 |
| 预计归还日期为过去/现在 | ❌ 未覆盖 | 需补充 400 断言 |
| ISBN 重复新增/更新 | ✅ 已覆盖 | `test_book_crud_and_isbn_uniqueness` |
| 分类循环依赖 | ❌ 未覆盖 | 自引用、移动到子节点下 |
| 分类删除约束 | ✅ 已覆盖 | 子分类、关联图书 |
| 同一天不重复提醒 | ❌ 未覆盖 | `scheduler.check_and_create_notifications` 去重逻辑 |
| 到期前 3 天/当天/逾期消息 | ⚠️ 部分覆盖 | 仅逾期场景被覆盖 |
| 分页边界 | ❌ 未覆盖 | page=1、空列表、page_size 边界 |

---

## 5. 需要补充测试的具体要求

### 5.1 后端补充测试清单

| 优先级 | 测试项 | 目标文件 | 说明 |
|--------|--------|----------|------|
| P0 | 未登录/无效 Token 访问受保护接口 | `test_api.py` | 不带 Token 访问 `GET /api/books`，断言 401 |
| P0 | 图书不存在 404 | `test_api.py` | `GET/PUT/DELETE /api/books/{id}` 对不存在 ID 返回 404 |
| P0 | 借阅状态机非法转换 | `test_api.py` | approve/reject/lend/return 在错误状态下返回 400 |
| P0 | 预计归还日期校验 | `test_api.py` | 过去/当前日期返回 400 |
| P0 | 分类循环依赖校验 | `test_api.py` | 自引用、移动到子节点下返回 400 |
| P1 | 消息标记已读 | `test_api.py` | `POST /api/notifications/{id}/read` 成功及 404 |
| P1 | 未读过滤 | `test_api.py` | `GET /api/notifications?unread_only=true` |
| P1 | 健康检查 | `test_api.py` | `GET /health` 返回 ok |
| P1 | 封面上传 | `test_api.py` | 合法图片上传成功、非法格式返回 400 |
| P1 | 借出时库存不足 | `test_api.py` | approved 记录对应图书 stock=0 时 lend 返回 400 |
| P1 | 分类移动后 path 更新 | `test_api.py` | 更新父节点后子分类 path 同步更新 |
| P1 | 参数校验 422 | `test_api.py` | 非法字段类型触发 422 |
| P2 | 全局异常/数据库异常 | `test_api.py` | 通过 monkeypatch 触发 500 分支 |
| P2 | 定时任务边界 | `test_api.py` | 同一天不重复、即将到期、当天到期、缺少归还日期 |
| P2 | 统计空值显示 | `test_api.py` | 未分类、未设置部门 |

### 5.2 前端补充测试清单

| 优先级 | 测试项 | 目标文件 | 说明 |
|--------|--------|----------|------|
| P0 | 认证服务 | `src/services/auth.test.js` | `login/logout/getToken/setToken/clearToken` |
| P0 | 请求拦截器 | `src/services/request.test.js` | Token 注入、401 跳转、错误处理 |
| P1 | AuthContext | `src/contexts/AuthContext.test.jsx` | 登录状态、角色获取、登出 |
| P1 | PrivateRoute | `src/components/PrivateRoute.test.jsx` | 未登录跳转、角色不匹配跳转 |
| P1 | Layout 菜单 | `src/components/Layout.test.jsx` | 根据角色渲染菜单、退出登录 |
| P2 | 核心页面 | `src/pages/*.test.jsx` | 使用 `@testing-library/react` 测试表单提交、表格交互 |

---

## 6. 结论与建议

### 6.1 当前结论

- 后端接口测试 **12/12 通过**，整体代码覆盖率达到 **87%**，核心业务流程（认证、分类、图书、借阅、逾期提醒、统计导出）已基本覆盖。
- 前端工具函数测试 **5/5 通过**，但仅覆盖 `menu.js`，页面组件、服务层、路由守卫等均未编写单元测试。
- 异常分支与边界条件存在明显缺口：资源不存在 404、状态机非法转换、参数校验 422、分类循环依赖、消息已读、定时任务边界等均未覆盖。

### 6.2 补充测试建议

1. **优先补齐异常与边界测试**：重点补充 401/403/404/422/400 分支，覆盖所有 router 的异常路径。
2. **覆盖状态机全分支**：借阅单状态（pending/approved/borrowed/returned/rejected）之间的非法转换均需测试。
3. **覆盖分类树边界**：多级分类树构建、循环依赖检测、path 递归更新。
4. **覆盖通知与定时任务边界**：未读过滤、消息已读、同一天去重、到期前/当天/逾期消息文本。
5. **前端引入组件测试**：配置 `@testing-library/react` 与 `@vitest/coverage-v8`，从 `auth.js`、`request.js`、`AuthContext`、`PrivateRoute`、`Layout` 开始逐步覆盖。
6. **提升覆盖率目标**：建议后端核心 router 覆盖率达到 **90% 以上**，异常分支覆盖率达到 **80% 以上**。

---

## 7. 覆盖率工具说明

- **后端**：`pytest-cov` 已安装，执行命令：

  ```bash
  pytest --cov=backend backend/tests/ --cov-report=html
  ```

  若未安装，可执行：

  ```bash
  pip install pytest-cov
  ```

- **前端**：当前未安装覆盖率插件，建议安装：

  ```bash
  cd frontend
  npm install -D @vitest/coverage-v8
  npm run test -- --coverage
  ```
