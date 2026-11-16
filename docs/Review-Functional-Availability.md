# 企业图书借阅管理系统 — 功能可用性测试报告

> 生成日期：2026-07-31  
> 测试范围：前端交互层 + 后端 RESTful API  
> 测试方法：代码静态分析、本地启动服务（后端 uvicorn、前端 vite）、curl / Invoke-RestMethod 接口调用验证

---

## 1. 测试结论概览

| 指标 | 结果 |
|------|------|
| 发现缺陷总数 | **7** |
| 致命缺陷 | 0 |
| 严重缺陷 | **3** |
| 一般缺陷 | **3** |
| 提示缺陷 | **1** |
| 后端单元测试 | 12/12 通过（但用例未覆盖前端调用缺失的接口与参数名不一致问题） |
| 核心流程是否通畅 | **部分阻塞**：登录、图书检索、借阅申请、借出/归还登记、统计导出可跑通；**借阅审核的“拒绝”功能不可用**，**已审核/借阅中列表无法加载**，导致管理员日常批量审核与借还登记体验严重受损。 |

---

## 2. 核心流程验证结果

| 核心流程 | 状态 | 说明 |
|----------|------|------|
| 登录 → 图书检索 | 通畅 | 登录、token 持久化、图书列表/搜索/分类筛选均正常。 |
| 借阅申请 | 基本通畅 | 员工可正常提交申请；选择当天作为预计归还日期时会因 UTC 比较被拒（见缺陷 #6）。 |
| 借阅审核 | **阻塞** | “通过”正常；“拒绝”因参数名不一致导致 422 错误（缺陷 #2）。 |
| 借出/归还登记 | 半通畅 | 通过手动输入单号或待审核列表可完成借出/归还；但“借阅中”列表因缺少接口无法加载（缺陷 #1）。 |
| 分类管理（新增/编辑/删除/循环依赖） | 通畅 | 后端校验完整，循环依赖、子分类/图书占用删除均被拦截。 |
| 图书管理（ISBN 唯一性） | 通畅 | 新增/编辑 ISBN 唯一性校验正常。 |
| 图书封面上传 | **功能缺失** | 后端 `/books/upload-cover` 可用，但前端表单未集成上传组件（缺陷 #4）。 |
| 逾期提醒与消息中心 | 部分可用 | 后台线程可生成通知；逾期列表可加载，但缺少“逾期天数”字段（缺陷 #3）。 |
| 统计报表与导出 | 通畅 | 各维度统计、CSV/Excel 导出均正常。 |

---

## 3. 缺陷详情

### 缺陷 1：缺少“借阅记录通用列表”接口，导致已审核/借阅中列表无法加载

- **严重程度**：严重  
- **问题描述**：前端“借阅审核”页面的“已审核”标签页调用 `GET /api/borrows?status=approved,rejected,borrowed,returned`，“借还登记”页面的“待归还”标签页调用 `GET /api/borrows?status=borrowed`。但后端 `borrows` 路由只实现了 `POST /borrows`、`GET /borrows/my`、`GET /borrows/pending` 以及各状态变更接口，没有提供 `GET /borrows` 或带状态过滤的通用列表接口。
- **复现步骤**：
  1. 使用图书管理员账号登录前端。
  2. 进入“借阅审核”→“已审核”标签，或直接请求 `GET /api/borrows?status=borrowed`。
  3. 浏览器控制台/接口返回 404/405，列表为空。
- **期望结果**：后端返回符合条件的借阅记录分页列表。
- **实际结果**：接口返回 `405 Method Not Allowed`（或 404），列表始终为空。
- **影响范围**：管理员无法查看历史审核记录和当前“借阅中”记录，批量借还、逾期催还场景受影响。
- **建议修复**：在 `backend/routers/borrows.py` 中新增 `GET /borrows` 端点，支持 `status` 等多条件过滤，并复用 `_list_response` 返回分页，权限校验使用 `require_librarian_or_admin`。
- **代码位置**：
  - 前端调用点 1：[frontend/src/pages/BorrowAudit.jsx:43-44](file:///d:/workspace/Book%20borrowing%20management%20system/frontend/src/pages/BorrowAudit.jsx#L43-L44)
  - 前端调用点 2：[frontend/src/pages/BorrowLendReturn.jsx:50-51](file:///d:/workspace/Book%20borrowing%20management%20system/frontend/src/pages/BorrowLendReturn.jsx#L50-L51)
  - 后端缺失位置：[backend/routers/borrows.py](file:///d:/workspace/Book%20borrowing%20management%20system/backend/routers/borrows.py)（应在 `list_my_borrows`/`list_pending_borrows` 之后补充通用列表接口）

---

### 缺陷 2：借阅审核“拒绝”请求参数名与后端契约不一致

- **严重程度**：严重  
- **问题描述**：前端在拒绝借阅时发送的请求体字段为 `reason`，而后端 `BorrowRejectRequest` 模型要求字段名为 `reject_reason`。导致 FastAPI 校验失败，拒绝理由无法保存。
- **复现步骤**：
  1. 员工提交借阅申请。
  2. 管理员在“借阅审核”点击“拒绝”并填写理由。
  3. 前端发送 `POST /api/borrows/{id}/reject`，Payload 为 `{ reason: '...' }`。
  4. 后端返回 422，提示 `Field required: reject_reason`。
- **期望结果**：拒绝成功，理由保存并可在员工的“我的借阅”中查看。
- **实际结果**：接口返回 422，拒绝操作失败，员工看不到拒绝理由。
- **影响范围**：借阅审核核心流程中断，管理员无法拒绝申请。
- **建议修复**：统一字段名。最简方案是将前端请求体改为 `{ reject_reason: values.reason }`；若要保持前端习惯，也可将后端 `BorrowRejectRequest` 改为 `reason`，但与现有测试用例不兼容，推荐改前端。
- **代码位置**：
  - 前端请求：[frontend/src/pages/BorrowAudit.jsx:84](file:///d:/workspace/Book%20borrowing%20management%20system/frontend/src/pages/BorrowAudit.jsx#L84)
  - 后端模型：[backend/schemas.py:149-150](file:///d:/workspace/Book%20borrowing%20management%20system/backend/schemas.py#L149-L150)
  - 后端处理：[backend/routers/borrows.py:130-154](file:///d:/workspace/Book%20borrowing%20management%20system/backend/routers/borrows.py#L130-L154)

---

### 缺陷 3：逾期列表未返回“逾期天数”，前端显示恒为“-”

- **严重程度**：一般  
- **问题描述**：`OverdueList.jsx` 的“逾期天数”列读取 `record.overdue_days`，但后端 `BorrowRecordOut` 模型和 `/overdue` 接口均未计算和返回该字段。
- **复现步骤**：
  1. 构造一条 `status=borrowed` 且 `expected_return_date < now` 的记录。
  2. 管理员打开“逾期列表”。
  3. “逾期天数”列显示为 `-`。
- **期望结果**：列表展示实际逾期天数（例如 `3 天`）。
- **实际结果**：该列始终显示 `-`。
- **影响范围**：管理员无法直观判断逾期严重程度，影响催还优先级。
- **建议修复**：
  - 方案 A：在 `backend/schemas.py` 的 `BorrowRecordOut` 中新增 `overdue_days: Optional[int]`，由后端根据 `expected_return_date` 与当前 UTC 时间计算。
  - 方案 B：前端根据返回的 `expected_return_date` 自行计算。
- **代码位置**：
  - 前端列定义：[frontend/src/pages/OverdueList.jsx:90-93](file:///d:/workspace/Book%20borrowing%20management%20system/frontend/src/pages/OverdueList.jsx#L90-L93)
  - 后端响应模型：[backend/schemas.py:128-141](file:///d:/workspace/Book%20borrowing%20management%20system/backend/schemas.py#L128-L141)
  - 后端接口：[backend/routers/overdue.py:14-46](file:///d:/workspace/Book%20borrowing%20management%20system/backend/routers/overdue.py#L14-L46)

---

### 缺陷 4：图书表单未集成封面上传功能

- **严重程度**：严重  
- **问题描述**：PRD FR-BOOK-03 要求“支持封面图片本地上传，上传后返回可访问 URL”。后端已实现 `/api/books/upload-cover`，但 `BookForm.jsx` 中只有“封面图 URL”文本输入框，没有上传组件，用户只能手动粘贴外部 URL。
- **复现步骤**：
  1. 管理员进入“图书管理”→“新增图书”。
  2. 观察“封面图 URL”字段，无上传按钮。
  3. 选择本地图片无法完成封面上传。
- **期望结果**：前端提供上传按钮，调用 `/api/books/upload-cover`，并将返回的 `url` 回填到 `cover_url`。
- **实际结果**：封面上传入口缺失，PRD 要求的功能不可用。
- **影响范围**：违反 FR-BOOK-03，图书封面维护体验差。
- **建议修复**：在 `BookForm.jsx` 中使用 Ant Design `Upload` 组件，配置 `action="/api/books/upload-cover"`、headers 带 Authorization，并在 `onChange` 中将返回的 `url` 写入 form 字段 `cover_url`。
- **代码位置**：
  - 前端表单：[frontend/src/pages/BookForm.jsx:171-173](file:///d:/workspace/Book%20borrowing%20management%20system/frontend/src/pages/BookForm.jsx#L171-L173)
  - 后端上传接口：[backend/routers/books.py:192-215](file:///d:/workspace/Book%20borrowing%20management%20system/backend/routers/books.py#L192-L215)

---

### 缺陷 5：封面 URL 缺乏校验，存在存储型 XSS 风险

- **严重程度**：严重  
- **问题描述**：后端在创建/更新图书时未校验 `cover_url`，前端 `BookDetail.jsx` 直接将 `cover_url` 作为 `<img src>` 渲染。实测数据库中已存在 `cover_url = "javascript:alert(1)"` 的脏数据。虽然现代浏览器对 `img src="javascript:"` 的触发有拦截，但这仍属于不可信数据直接渲染，且可作为钓鱼/篡改页面行为的入口。
- **复现步骤**：
  1. 创建/编辑图书，在“封面图 URL”输入 `javascript:alert(1)` 或任意外链。
  2. 保存后进入图书详情页。
  3. 页面渲染 `<img src="javascript:alert(1)">`。
- **期望结果**：后端仅允许 http/https 图片 URL；前端对无法识别的 URL 做占位显示或白名单校验。
- **实际结果**：任意字符串均可保存并渲染。
- **影响范围**：潜在存储型 XSS、恶意跳转/脚本注入，影响所有查看图书详情的用户。
- **建议修复**：
  - 后端在 `BookCreate`/`BookUpdate` 中对 `cover_url` 增加 URL 格式与协议白名单校验（仅允许 `http://`/`https://`，可选内部 `/api/uploads/...`）。
  - 前端在展示封面时，若 URL 不符合白名单则显示占位图。
- **代码位置**：
  - 前端渲染：[frontend/src/pages/BookDetail.jsx:135-141](file:///d:/workspace/Book%20borrowing%20management%20system/frontend/src/pages/BookDetail.jsx#L135-L141)
  - 后端无校验：[backend/routers/books.py:103-128](file:///d:/workspace/Book%20borrowing%20management%20system/backend/routers/books.py#L103-L128)（`BookCreate`/`BookUpdate` 均未校验 `cover_url`）

---

### 缺陷 6：预计归还日期使用时区不一致，选择“今天”会被拒绝

- **严重程度**：一般  
- **问题描述**：前端 `DatePicker.disabledDate` 仅禁用早于当天的日期，允许选择“今天”；但后端 `create_borrow` 使用 `datetime.utcnow()` 与传入的日期字符串（被解析为 UTC 午夜）比较。在 UTC+8 时区下，选择当天本地日期会被解析为当天 UTC 00:00:00，通常早于 UTC 当前时间，导致被判定为“不在未来”。
- **复现步骤**：
  1. 员工在图书详情页选择“今天”作为预计归还日期。
  2. 提交借阅申请。
  3. 后端返回 400：`Expected return date must be in the future`。
- **期望结果**：前后端对“当天是否可选”保持一致；或统一按用户本地日期判断是否晚于当前时间。
- **实际结果**：前端允许选今天，后端因 UTC 比较拒绝。
- **影响范围**：员工在当天借书时无法选择当天归还（若业务允许当天借当天还），体验受损。
- **建议修复**：
  - 方案 A：前端 `disabledDate` 禁用“今天及以前”，即 `current && current <= dayjs().startOf('day')`。
  - 方案 B：后端将传入日期按用户时区或本地日期解析后再与当前时间比较。
- **代码位置**：
  - 前端日期选择：[frontend/src/pages/BookDetail.jsx:75-77](file:///d:/workspace/Book%20borrowing%20management%20system/frontend/src/pages/BookDetail.jsx#L75-L77)、[159-168](file:///d:/workspace/Book%20borrowing%20management%20system/frontend/src/pages/BookDetail.jsx#L159-L168)
  - 后端校验：[backend/routers/borrows.py:62-66](file:///d:/workspace/Book%20borrowing%20management%20system/backend/routers/borrows.py#L62-L66)

---

### 缺陷 7：前端路由缺少角色级访问控制

- **严重程度**：提示  
- **问题描述**：`PrivateRoute` 仅校验是否登录，未校验角色。虽然菜单按角色过滤，但员工或系统管理员可通过直接输入 URL 访问 `/borrow-review`、`/borrow-return`、`/overdue` 等页面。页面本身也未做统一角色拦截（仅后端接口会返回 403）。
- **复现步骤**：
  1. 使用 employee 账号登录。
  2. 在地址栏直接访问 `http://localhost:5173/borrow-review`。
  3. 页面可打开，操作按钮可见；点击操作时后端返回 403。
- **期望结果**：前端路由应根据角色重定向到无权限页或 403 页面。
- **实际结果**：页面可被未授权角色直接访问。
- **影响范围**：权限体验不完整，存在越权查看页面信息的风险（虽然数据由后端保护）。
- **建议修复**：扩展 `PrivateRoute` 或在 `App.jsx` 中为各路由配置 `allowedRoles`，无权限时显示 403/重定向。
- **代码位置**：
  - 路由定义：[frontend/src/App.jsx:34-49](file:///d:/workspace/Book%20borrowing%20management%20system/frontend/src/App.jsx#L34-L49)
  - 私有路由守卫：[frontend/src/components/PrivateRoute.jsx:6-25](file:///d:/workspace/Book%20borrowing%20management%20system/frontend/src/components/PrivateRoute.jsx#L6-L25)

---

## 4. 补充说明

1. **后端单元测试**：`backend/tests/test_api.py` 12 条用例全部通过，但测试未覆盖“通用借阅列表接口缺失”与“前端拒绝参数名不一致”的问题，建议在修复后补充对应接口与前端调用契约的测试。
2. **分类管理循环依赖**：已在 `backend/routers/categories.py:110-123` 中实现自身父节点与移动到子节点下的校验，经验证正常。
3. **ISBN 唯一性**：新增/编辑均正常拦截重复 ISBN，经验证正常。
4. **统计导出**：CSV 与 Excel 导出均返回正确的 `Content-Disposition` 与文件内容，经验证正常。
5. **用户/角色管理**：PRD 与 spec 均明确为占位页面，未纳入本次功能可用性缺陷统计。
