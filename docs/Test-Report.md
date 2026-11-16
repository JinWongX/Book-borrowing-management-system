# 企业图书借阅管理系统测试报告

## 1. 测试环境

| 项目 | 版本/说明 |
|------|-----------|
| 操作系统 | Windows（PowerShell） |
| Python | 3.11.13 |
| Node.js | 16.20.2 |
| 后端框架 | FastAPI 0.111.0 + SQLAlchemy 2.0.31 + SQLite |
| 前端框架 | Vite 4.x + React 18 + Ant Design 5.x |
| 测试工具 | pytest 9.0.3、Vitest 0.34.6、FastAPI TestClient |
| 测试数据库 | SQLite :memory:（每个测试函数独立数据库） |

## 2. 测试范围

本次跑批覆盖系统第四阶段核心功能，主要包括：

- **用户认证与 RBAC**：登录成功/失败、角色鉴权拦截。
- **图书分类管理**：分类 CRUD、子分类/图书关联时删除约束、权限校验。
- **图书信息管理**：图书 CRUD、ISBN 唯一性校验、图书搜索（按书名/作者/ISBN/分类）。
- **借阅流程**：借阅申请 → 审核通过/拒绝 → 借出登记 → 归还登记，库存自动更新。
- **库存校验**：库存为 0 时禁止申请。
- **逾期提醒**：逾期提醒生成任务、员工消息中心、管理员逾期列表。
- **统计报表**：按图书/分类/部门/个人统计及 Top20。
- **导出功能**：统计报表 CSV/Excel 导出。
- **前端构建**：`npm run build` 生产构建。
- **前端工具函数测试**：角色菜单过滤逻辑。

## 3. 测试执行结果

### 3.1 后端接口自动化测试

执行命令：

```bash
pytest backend/tests/ -v
```

结果已保存至：[docs/test-results.log](./test-results.log)

| 测试用例 | 说明 | 结果 |
|----------|------|------|
| test_login_success | 正确用户名密码登录成功并返回用户信息 | 通过 |
| test_login_failure | 错误密码登录返回 401 | 通过 |
| test_category_crud_permission | 分类 CRUD 及员工无权限创建 | 通过 |
| test_category_delete_constraints | 分类含子分类/图书时禁止删除 | 通过 |
| test_book_crud_and_isbn_uniqueness | 图书 CRUD 及 ISBN 唯一性校验 | 通过 |
| test_book_search | 按关键词、ISBN、分类搜索图书 | 通过 |
| test_borrow_full_flow | 借阅申请→审核→借出→归还完整流程 | 通过 |
| test_borrow_reject | 审核拒绝并记录拒绝原因 | 通过 |
| test_borrow_out_of_stock | 库存为 0 时无法申请 | 通过 |
| test_overdue_notification_generation | 逾期提醒生成及列表查询 | 通过 |
| test_statistics_endpoints | 各维度统计接口及权限校验 | 通过 |
| test_export_csv_and_excel | 统计报表 CSV/Excel 导出 | 通过 |

**统计：12 个测试用例全部通过，通过率 100%。**

> 执行过程中出现 5 条 DeprecationWarning（Pydantic V2 `class-based config`、FastAPI `on_event` 生命周期事件），不影响功能正确性，建议在后续迭代中逐步迁移。

### 3.2 前端构建

执行命令：

```bash
cd frontend
npm run build
```

**结果：构建成功**，生成 `frontend/dist/` 产物。

### 3.3 前端工具函数测试

执行命令：

```bash
cd frontend
npm run test
```

| 测试文件 | 测试数 | 结果 |
|----------|--------|------|
| src/utils/menu.test.js | 5 | 全部通过 |

**统计：5 个前端测试用例全部通过，通过率 100%。**

## 4. 缺陷列表

本次跑批未发现功能性缺陷。记录以下观察项（非缺陷）：

| 序号 | 观察项 | 建议 |
|------|--------|------|
| 1 | FastAPI `on_event` 已弃用 | 后续迁移至 `lifespan` 事件处理器 |
| 2 | Pydantic `class-based Config` 已弃用 | 统一改用 `ConfigDict` |
| 3 | 前端构建提示存在大于 500KB 的 chunk | 可按需使用动态导入进行代码分割 |

## 5. 测试结论

- 后端接口自动化测试 **12/12 通过**，覆盖登录、RBAC、图书分类、图书信息、借阅全流程、逾期提醒、统计与导出等核心接口，使用内存 SQLite 隔离测试数据，未污染生产数据库。
- 前端生产构建成功，可正常产出部署产物。
- 前端补充的 Vitest 工具函数测试 **5/5 通过**。

综上，当前系统核心功能在测试范围内表现正常，跑批结果可信，可进入下一阶段或交付验收。
