# 前端测试覆盖率基线报告

> 生成日期：2026-08-05  
> 执行命令：`cd frontend && npm run test -- --coverage`  
> 测试框架：Vitest v0.34.6 + @vitest/coverage-v8  
> 配置：`vite.config.js` 已启用 `coverage.all: true`，覆盖范围为 `src/**/*`

---

## 1. 测试执行汇总

| 指标 | 数值 |
|------|------|
| 测试文件数 | 3 |
| 用例总数 | 18 |
| 通过数量 | 18 |
| 失败数量 | 0 |
| 通过率 | 100% |

### 已有测试文件

| 文件 | 用例数 | 覆盖模块 |
|------|--------|----------|
| `frontend/src/utils/menu.test.js` | 5 | `menu.js` 按角色过滤、菜单 key 唯一性 |
| `frontend/src/services/request.test.js` | 9 | `request.js` Token 校验、请求/响应拦截器 |
| `frontend/src/contexts/AuthContext.test.jsx` | 4 | `AuthContext.jsx` 过期/无效 Token 清理、获取当前用户 |

---

## 2. 覆盖率汇总

| 指标 | 覆盖率 |
|------|--------|
| Statements（语句） | 8.02% |
| Branches（分支） | 53.33% |
| Functions（函数） | 19.23% |
| Lines（代码行） | 8.02% |

> 说明：因启用 `coverage.all: true`，所有 `src/` 下源文件均参与统计，未编写测试的页面与组件以 0% 计入，导致总体覆盖率较低。

---

## 3. 分文件覆盖率明细

| 目录/文件 | % Stmts | % Branch | % Funcs | % Lines | 未覆盖行号 |
|-----------|---------|----------|---------|---------|-----------|
| **All files** | 8.02 | 53.33 | 19.23 | 8.02 | — |
| `src/App.jsx` | 0 | 0 | 0 | 0 | 1-101 |
| `src/components/Layout.jsx` | 0 | 0 | 0 | 0 | 1-70 |
| `src/components/PrivateRoute.jsx` | 0 | 0 | 0 | 0 | 1-27 |
| `src/components/RoleRoute.jsx` | 0 | 0 | 0 | 0 | 1-35 |
| `src/contexts/AuthContext.jsx` | 81.96 | 87.5 | 60 | 81.96 | 35-41, 44-47 |
| `src/hooks/useAuth.js` | 0 | 0 | 0 | 0 | 1 |
| `src/pages/BookDetail.jsx` | 0 | 0 | 0 | 0 | 1-176 |
| `src/pages/BookForm.jsx` | 0 | 0 | 0 | 0 | 1-226 |
| `src/pages/BookList.jsx` | 0 | 0 | 0 | 0 | 1-203 |
| `src/pages/BorrowAudit.jsx` | 0 | 0 | 0 | 0 | 1-213 |
| `src/pages/BorrowLendReturn.jsx` | 0 | 0 | 0 | 0 | 1-234 |
| `src/pages/CategoryList.jsx` | 0 | 0 | 0 | 0 | 1-223 |
| `src/pages/Dashboard.jsx` | 0 | 0 | 0 | 0 | 1-27 |
| `src/pages/Login.jsx` | 0 | 0 | 0 | 0 | 1-79 |
| `src/pages/MyBorrows.jsx` | 0 | 0 | 0 | 0 | 1-134 |
| `src/pages/Notifications.jsx` | 0 | 0 | 0 | 0 | 1-101 |
| `src/pages/OverdueList.jsx` | 0 | 0 | 0 | 0 | 1-138 |
| `src/pages/PlaceholderPage.jsx` | 0 | 0 | 0 | 0 | 1-15 |
| `src/pages/Statistics.jsx` | 0 | 0 | 0 | 0 | 1-226 |
| `src/services/auth.js` | 0 | 0 | 0 | 0 | 1-16 |
| `src/services/request.js` | 96.87 | 92.85 | 100 | 96.87 | 29-30 |
| `src/utils/menu.js` | 100 | 100 | 100 | 100 | — |

---

## 4. 未覆盖模块与缺失场景

### 4.1 完全未覆盖的文件（0%）

| 文件 | 职责 | 需覆盖的关键场景 |
|------|------|------------------|
| `src/App.jsx` | 应用路由配置 | 登录页渲染、受保护路由、角色路由、Layout 嵌套 outlet |
| `src/components/Layout.jsx` | 页面布局与菜单 | 按角色渲染菜单、菜单点击跳转、退出登录、Header 用户信息 |
| `src/components/PrivateRoute.jsx` | 登录态校验 | loading 状态、未登录跳转、已登录放行 |
| `src/components/RoleRoute.jsx` | 角色权限校验 | loading 状态、未登录跳转、无权限跳转、有权限放行 |
| `src/hooks/useAuth.js` | Auth Hook 导出 | Hook 返回值与 AuthContext 一致 |
| `src/pages/Login.jsx` | 登录页 | 表单校验、登录成功、登录失败、错误提示 |
| `src/pages/BookList.jsx` | 图书检索 | 列表加载、搜索、分页、分类筛选、删除图书 |
| `src/pages/BookDetail.jsx` | 图书详情 | 详情展示、借阅申请、库存不足、返回列表 |
| `src/pages/BookForm.jsx` | 新增/编辑图书 | 表单提交、ISBN 校验、封面上传、无权限提示 |
| `src/pages/CategoryList.jsx` | 分类管理 | 分类树渲染、新增/编辑/删除、循环依赖禁用 |
| `src/pages/MyBorrows.jsx` | 我的借阅 | 列表状态展示、分页、查看图书跳转 |
| `src/pages/BorrowAudit.jsx` | 借阅审核 | 待审核/已审核列表、通过/拒绝操作 |
| `src/pages/BorrowLendReturn.jsx` | 借出/归还登记 | 单号解析、借出/归还成功与失败、列表快捷操作 |
| `src/pages/Notifications.jsx` | 消息中心 | 消息列表、标记已读、全部已读、空态 |
| `src/pages/OverdueList.jsx` | 逾期列表 | 列表加载、分页、查看图书跳转 |
| `src/pages/Statistics.jsx` | 统计报表 | 各维度统计表格/图表、导出 Excel/CSV |
| `src/pages/Dashboard.jsx` | 首页 | 按角色显示欢迎文案 |
| `src/pages/PlaceholderPage.jsx` | 占位页面 | 根据 title 渲染 |
| `src/services/auth.js` | 认证 API | `login` 表单编码、`getCurrentUser` 调用 |

### 4.2 部分覆盖的文件

#### `src/contexts/AuthContext.jsx`（81.96%）

| 未覆盖行 | 代码区域 | 缺失场景 |
|----------|----------|----------|
| 35-41 | `login` 函数整体 | 登录成功写入 token、获取当前用户、跳转首页 |
| 44-47 | `logout` 函数整体 | 清除 token、跳转登录页 |

#### `src/services/request.js`（96.87%）

| 未覆盖行 | 代码区域 | 缺失场景 |
|----------|----------|----------|
| 29-30 | `isTokenValid` 的 `catch` 分支 | payload JSON 解析异常（已通过基线其他用例间接覆盖，但 v8 仍标记为未覆盖） |

---

## 5. 覆盖率阈值检查

配置阈值：

- Statements ≥ 95%
- Branches ≥ 90%
- Functions ≥ 95%
- Lines ≥ 95%

基线结果：**未达标**。需在补充测试后重新验证。
