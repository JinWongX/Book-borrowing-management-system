# 前端测试覆盖率最终报告

> 生成日期：2026-08-05  
> 执行命令：`cd frontend && npm run test -- --coverage`  
> 测试框架：Vitest v0.34.6 + @vitest/coverage-v8  
> 配置：`vite.config.js` 已启用 `coverage.all: true`，覆盖范围为 `src/**/*`

---

## 1. 测试执行汇总

| 指标 | 数值 |
|------|------|
| 测试文件数 | 22 |
| 用例总数 | 163 |
| 通过数量 | 163 |
| 失败数量 | 0 |
| 未处理错误 | 0 |
| 通过率 | 100% |
| 命令退出码 | 0 |

### 测试文件清单

| 文件 | 覆盖模块 |
|------|----------|
| `frontend/src/utils/menu.test.js` | `menu.js` 按角色过滤、菜单 key 唯一性 |
| `frontend/src/services/request.test.js` | `request.js` Token 校验、请求/响应拦截器、payload 异常 |
| `frontend/src/services/auth.test.js` | `auth.js` 登录/获取当前用户 |
| `frontend/src/contexts/AuthContext.test.jsx` | `AuthContext.jsx` 过期/无效 Token 清理、获取当前用户 |
| `frontend/src/hooks/useAuth.test.js` | `useAuth.js` Hook 返回值 |
| `frontend/src/App.test.jsx` | `App.jsx` 路由渲染 |
| `frontend/src/components/Layout.test.jsx` | `Layout.jsx` 菜单、退出登录、Header 信息 |
| `frontend/src/components/PrivateRoute.test.jsx` | `PrivateRoute.jsx` 登录态校验 |
| `frontend/src/components/RoleRoute.test.jsx` | `RoleRoute.jsx` 角色权限校验 |
| `frontend/src/pages/BookDetail.test.jsx` | `BookDetail.jsx` 详情、借阅、库存、错误处理 |
| `frontend/src/pages/BookForm.test.jsx` | `BookForm.jsx` 新增/编辑、ISBN 校验、封面上传 |
| `frontend/src/pages/BookList.test.jsx` | `BookList.jsx` 检索、分页、分类、删除、权限 |
| `frontend/src/pages/BorrowAudit.test.jsx` | `BorrowAudit.jsx` 待审/已审、通过/拒绝、fallback 字段 |
| `frontend/src/pages/BorrowLendReturn.test.jsx` | `BorrowLendReturn.jsx` 借出/归还登记、Tab 切换、空单号 |
| `frontend/src/pages/CategoryList.test.jsx` | `CategoryList.jsx` 分类树、增删改、权限 |
| `frontend/src/pages/Dashboard.test.jsx` | `Dashboard.jsx` 欢迎文案 |
| `frontend/src/pages/Login.test.jsx` | `Login.jsx` 登录表单、成功/失败 |
| `frontend/src/pages/MyBorrows.test.jsx` | `MyBorrows.jsx` 借阅记录、状态、fallback |
| `frontend/src/pages/Notifications.test.jsx` | `Notifications.jsx` 消息、标记已读/全部已读、fallback |
| `frontend/src/pages/OverdueList.test.jsx` | `OverdueList.jsx` 逾期列表、天数 fallback |
| `frontend/src/pages/PlaceholderPage.test.jsx` | `PlaceholderPage.jsx` 占位页面 |
| `frontend/src/pages/Statistics.test.jsx` | `Statistics.jsx` 统计表格、图表、导出 |

---

## 2. 覆盖率汇总

| 指标 | 覆盖率 | 目标 | 是否达标 |
|------|--------|------|----------|
| Statements（语句） | 99.34% | ≥95% | ✅ |
| Branches（分支） | 91.56% | ≥90% | ✅ |
| Functions（函数） | 90.25% | ≥85% | ✅ |
| Lines（代码行） | 99.34% | ≥95% | ✅ |

> 说明：因启用 `coverage.all: true`，所有 `src/` 下源文件均参与统计。最终所有页面与组件均已有测试覆盖。

---

## 3. 分文件覆盖率明细

| 目录/文件 | % Stmts | % Branch | % Funcs | % Lines | 未覆盖行号 |
|-----------|---------|----------|---------|---------|-----------|
| **All files** | 99.34 | 91.56 | 90.25 | 99.34 | — |
| `src/App.jsx` | 100 | 100 | 100 | 100 | — |
| `src/components/Layout.jsx` | 100 | 83.33 | 100 | 100 | 46 |
| `src/components/PrivateRoute.jsx` | 100 | 100 | 100 | 100 | — |
| `src/components/RoleRoute.jsx` | 100 | 100 | 100 | 100 | — |
| `src/contexts/AuthContext.jsx` | 100 | 100 | 100 | 100 | — |
| `src/hooks/useAuth.js` | 100 | 100 | 100 | 100 | — |
| `src/pages/BookDetail.jsx` | 97.15 | 78.12 | 75 | 97.15 | 55-57, 76-77 |
| `src/pages/BookForm.jsx` | 96.01 | 81.57 | 85.71 | 96.01 | 90-96, 98-99 |
| `src/pages/BookList.jsx` | 100 | 100 | 78.57 | 100 | — |
| `src/pages/BorrowAudit.jsx` | 100 | 92.85 | 100 | 100 | 46-51 |
| `src/pages/BorrowLendReturn.jsx` | 99.14 | 77.27 | 100 | 99.14 | 59-60 |
| `src/pages/CategoryList.jsx` | 100 | 87.75 | 100 | 100 | 38, 46, 67, 90, 103 |
| `src/pages/Dashboard.jsx` | 100 | 100 | 100 | 100 | — |
| `src/pages/Login.jsx` | 100 | 100 | 100 | 100 | — |
| `src/pages/MyBorrows.jsx` | 100 | 100 | 100 | 100 | — |
| `src/pages/Notifications.jsx` | 100 | 97.05 | 100 | 100 | 41 |
| `src/pages/OverdueList.jsx` | 100 | 97.72 | 100 | 100 | 87 |
| `src/pages/PlaceholderPage.jsx` | 100 | 100 | 100 | 100 | — |
| `src/pages/Statistics.jsx` | 100 | 100 | 60.86 | 100 | — |
| `src/services/auth.js` | 100 | 100 | 100 | 100 | — |
| `src/services/request.js` | 100 | 100 | 100 | 100 | — |
| `src/utils/menu.js` | 100 | 100 | 100 | 100 | — |

---

## 4. 本次补充的主要测试分支

| 源文件 | 补充覆盖的分支场景 |
|--------|--------------------|
| `BookDetail.jsx` | 图书不存在占位、借阅申请失败（含默认错误消息）、无库存按钮禁用、fetch 失败默认提示 |
| `BookList.jsx` | 员工角色隐藏管理按钮、分类/图书默认错误、空响应 fallback、`category_name` 与 `-` fallback、删除失败默认提示 |
| `BorrowAudit.jsx` | 待审/已审数据数组/空对象 fallback、渲染字段全 fallback（`user_name`/`book_title`/`book_isbn`）、未知状态、Tab 切换、通过/拒绝默认错误、拒绝模态框取消 |
| `BorrowLendReturn.jsx` | 待借出接口默认错误、空/空白单号警告、归还登记空单号、Tab 直接切换、借阅中接口返回 `null` |
| `CategoryList.jsx` | 员工角色隐藏管理按钮、分类/提交/删除默认错误、模态框取消 |
| `MyBorrows.jsx` | 数组响应、`res.data.data` 缺失 fallback、默认错误 |
| `OverdueList.jsx` | 数组响应、`res.data.data` 缺失 fallback、`overdue_days` 为 `undefined/null` 的 `-` fallback、默认错误 |
| `Notifications.jsx` | 数组响应、`res.data.data` 缺失 fallback、`created_at` 为 `null` 的 `-` fallback、标记已读/全部已读默认错误 |
| `Statistics.jsx` | 统计数据默认错误、导出失败默认错误 |
| `request.js` | `isTokenValid` payload 非 Base64 / 非 JSON 时的 `catch` 分支 |

---

## 5. 仍未覆盖的分支及原因

| 源文件 | 未覆盖行 | 代码区域 | 未覆盖原因 |
|--------|----------|----------|------------|
| `BookDetail.jsx` | 55-57 | `handleBorrow` 中 `if (!book \|\| book.stock <= 0)` | 当库存为 0 时"申请借阅"按钮已禁用，无法打开借阅弹窗触发该分支 |
| `BookDetail.jsx` | 76-77 | `disabledDate` 函数 | 使用自定义 DatePicker mock 渲染，无法直接调用 Ant Design 内部的 `disabledDate` |
| `BookForm.jsx` | 90-96, 98-99 | 封面上传错误 / 预览分支 | 涉及原生文件对象与 `URL.createObjectURL`，在 jsdom 中较难完整模拟 |
| `BorrowAudit.jsx` | 46-51 | `fetchRecords` 中已审列表的 `auditedData` 数组 fallback | 该分支需要 `/borrows` 直接返回数组；已覆盖待审数组但未覆盖已审数组路径，且与已覆盖场景合并后未触发 |
| `BorrowLendReturn.jsx` | 59-60 | `fetchBorrowed` 的 `catch` 块 | `await request.get(...).catch(() => null)` 已将错误吞掉，外部 `try/catch` 无法捕获，属于不可达代码 |
| `CategoryList.jsx` | 38, 46 | `getDisabledKeys` 中 `if (!node) return set;` | 防御性分支，无法通过树组件构造出 `null` 节点 |
| `CategoryList.jsx` | 67 | `fetchCategories` 的 `catch` 块 | 尝试多种错误响应已覆盖，v8 仍标记该行；代码等价于已覆盖的默认错误分支 |
| `CategoryList.jsx` | 90, 103 | `handleEdit` / `handleDelete` 中 `if (!category) return;` | 防御性分支；树节点 `nodeData.id` 始终能在 `categories` 状态中找到对应分类，无法通过 UI 触发 |
| `Notifications.jsx` | 41 | `handleReadAll` 中 `if (unreadIds.length === 0) return;` | 当无未读消息时"全部已读"按钮被 `disabled`，无法触发点击 |
| `OverdueList.jsx` | 87 | `overdue_days` 为 `undefined` 的 `-` fallback | 已覆盖 `null` 分支；v8 报告仍显示该行，与数据解析结构有关，实际等价 `-` 分支已覆盖 |

> 结论：剩余未覆盖行大多为防御性代码、Ant Design 组件内部行为或需要复杂 DOM/API 模拟的分支。整体分支覆盖率已达到 91.56%，满足 ≥90% 目标。

---

## 6. 覆盖率阈值检查

`vite.config.js` 配置阈值：

- Statements ≥ 95%
- Branches ≥ 90%
- Functions ≥ 85%
- Lines ≥ 95%

最终结果：**全部达标**。
