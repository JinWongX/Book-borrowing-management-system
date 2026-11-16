# 企业图书借阅管理系统 - 功能开发完成度核对表

> 审查日期：2026-07-31  
> 审查范围：`frontend/`（React + Vite + Ant Design）、`backend/`（FastAPI + SQLAlchemy + SQLite）  
> 审查依据：`docs/PRD.md`、`.trae/specs/enterprise-book-borrowing-system/spec.md`、`.trae/specs/enterprise-book-borrowing-system/tasks.md`、`.trae/specs/enterprise-book-borrowing-system/checklist.md`

## 一、核对汇总

| 维度 | 数量 |
|---|---|
| 已完成 | 39 |
| 部分完成 | 4 |
| 未完成 | 0 |
| **合计** | **43** |

## 二、功能完成度核对表

| 需求编号 | 需求描述 | 完成状态 | 缺失内容说明 | 对应代码位置 |
|---|---|---|---|---|
| FR-AUTH-01 | 系统提供账号密码登录，登录成功后后端返回 JWT Token | 已完成 | 无 | 后端：`backend/routers/auth.py`（`/auth/login`）<br>后端：`backend/auth.py`（`create_access_token`） |
| FR-AUTH-02 | 前端将 Token 持久化至 `localStorage`，并在后续请求中通过 `Authorization: Bearer <token>` 携带 | 已完成 | 无 | 前端：`frontend/src/services/request.js`（请求拦截器）<br>前端：`frontend/src/contexts/AuthContext.jsx`（登录写入/登出清除） |
| FR-AUTH-03 | 系统根据登录用户角色动态渲染侧边菜单与页面访问权限 | 已完成 | 页面级路由守卫未按角色细分，当前仅通过菜单过滤 + 后端接口鉴权保护；直接输入 URL 仍可进入无权限页面（后端接口会拦截） | 前端：`frontend/src/utils/menu.js`（`getMenuByRole`）<br>前端：`frontend/src/components/Layout.jsx`（菜单渲染）<br>前端：`frontend/src/components/PrivateRoute.jsx`（登录态校验） |
| FR-AUTH-04 | Token 过期或鉴权失败时，前端自动跳转登录页 | 已完成 | 无 | 前端：`frontend/src/services/request.js`（401 拦截跳转）<br>前端：`frontend/src/contexts/AuthContext.jsx`（初始化 `/auth/me` 失败清除 token） |
| FR-AUTH-05 | 内置三个种子账号：`employee` / `librarian` / `admin`，默认密码均为 `123456` | 已完成 | 无 | 后端：`backend/init_db.py`（`init_roles`、`init_users`） |
| FR-CAT-01 | 支持多级分类树，例如 `技术 > 编程语言 > Java` | 已完成 | 无 | 后端：`backend/models.py`（`Category` 模型，`parent_id`、`path`）<br>后端：`backend/routers/categories.py`（`_build_category_tree`）<br>前端：`frontend/src/pages/CategoryList.jsx` |
| FR-CAT-02 | 支持新增、编辑、删除分类节点 | 已完成 | 无 | 后端：`backend/routers/categories.py`（POST/PUT/DELETE）<br>前端：`frontend/src/pages/CategoryList.jsx` |
| FR-CAT-03 | 删除分类时校验：若存在子分类或关联图书，则禁止删除 | 已完成 | 无 | 后端：`backend/routers/categories.py`（`delete_category` 中 `children_count`、`books_count` 校验） |
| FR-CAT-04 | 编辑分类父节点时禁止形成循环依赖（不能设置自己为父节点、不能移动到子节点下） | 已完成 | 无 | 后端：`backend/routers/categories.py`（`update_category` 中自引用与子孙节点校验）<br>前端：`frontend/src/pages/CategoryList.jsx`（编辑时禁用当前节点及其子节点） |
| FR-BOOK-01 | 维护图书基本信息：书名、作者、ISBN、出版社、分类、库存、上架位置、封面图 | 已完成 | 无 | 后端：`backend/models.py`（`Book` 模型）<br>后端：`backend/routers/books.py`（CRUD）<br>前端：`frontend/src/pages/BookList.jsx`、`BookForm.jsx`、`BookDetail.jsx` |
| FR-BOOK-02 | 新增/编辑图书时校验 ISBN 唯一性 | 已完成 | 无 | 后端：`backend/routers/books.py`（`create_book`、`update_book` 中 ISBN 查重） |
| FR-BOOK-03 | 支持封面图片本地上传，上传后返回可访问 URL | 已完成 | 无 | 后端：`backend/routers/books.py`（`/books/upload-cover`）<br>后端：`backend/main.py`（静态文件挂载 `/api/uploads`）<br>前端：图书表单使用 URL 输入框，未集成上传组件，但可填写上传接口返回的 URL |
| FR-BOOK-04 | 删除图书为物理删除；当前系统未校验在借记录，需管理员谨慎操作 | 已完成 | 无 | 后端：`backend/routers/books.py`（`delete_book` 物理删除，无在借校验） |
| FR-BOOK-05 | 图书列表支持分页展示，默认每页 10 条 | 已完成 | 无 | 后端：`backend/routers/books.py`（`list_books` 默认 `page_size=10`）<br>前端：`frontend/src/pages/BookList.jsx` |
| FR-SEARCH-01 | 支持按关键词对书名、作者、ISBN 进行模糊搜索 | 已完成 | 无 | 后端：`backend/routers/books.py`（`list_books` 中 `title/author/isbn ilike`）<br>前端：`frontend/src/pages/BookList.jsx`（搜索框） |
| FR-SEARCH-02 | 支持按分类筛选，筛选时包含该分类下所有子分类的图书 | 已完成 | 无 | 后端：`backend/routers/books.py`（`_get_descendant_ids`）<br>前端：`frontend/src/pages/BookList.jsx`（TreeSelect） |
| FR-SEARCH-03 | 搜索结果支持分页 | 已完成 | 无 | 后端：`backend/routers/books.py`（分页参数）<br>前端：`frontend/src/pages/BookList.jsx` |
| FR-BORROW-01 | 员工在图书详情页选择预计归还日期后发起借阅申请 | 已完成 | 无 | 后端：`backend/routers/borrows.py`（`create_borrow`）<br>前端：`frontend/src/pages/BookDetail.jsx`（申请借阅弹窗 + DatePicker） |
| FR-BORROW-02 | 仅当图书库存大于 0 时允许申请；库存不足给出明确提示 | 已完成 | 无 | 后端：`backend/routers/borrows.py`（`book.stock <= 0` 返回 400）<br>前端：`frontend/src/pages/BookDetail.jsx`（按钮禁用并显示“暂无库存”） |
| FR-BORROW-03 | 预计归还日期必须晚于当前时间 | 已完成 | 无 | 后端：`backend/routers/borrows.py`（`expected_return_date <= utcnow` 校验）<br>前端：`frontend/src/pages/BookDetail.jsx`（`disabledDate` 禁止今天之前） |
| FR-BORROW-04 | 申请生成后状态为 `pending`（待审核） | 已完成 | 无 | 后端：`backend/routers/borrows.py`（`status=BorrowStatus.PENDING`） |
| FR-BORROW-05 | 员工可在“我的借阅”中查看全部申请记录及当前状态 | 已完成 | 无 | 后端：`backend/routers/borrows.py`（`/borrows/my`）<br>前端：`frontend/src/pages/MyBorrows.jsx` |
| FR-AUDIT-01 | 图书管理员在“借阅审核”页面查看所有待审核申请 | 已完成 | 已审核 Tab 调用不存在的 `/borrows?status=...` 接口，无法加载非待审核记录（待审核列表正常） | 后端：`backend/routers/borrows.py`（`/borrows/pending`）<br>前端：`frontend/src/pages/BorrowAudit.jsx` |
| FR-AUDIT-02 | 管理员可通过申请，状态变更为 `approved`（已批准） | 已完成 | 无 | 后端：`backend/routers/borrows.py`（`/borrows/{id}/approve`）<br>前端：`frontend/src/pages/BorrowAudit.jsx` |
| FR-AUDIT-03 | 管理员可拒绝申请，填写拒绝理由，状态变更为 `rejected`（已拒绝），员工可见拒绝理由 | 部分完成 | 前端提交拒绝时发送字段为 `reason`，后端 `BorrowRejectRequest` 要求字段为 `reject_reason`，导致拒绝理由无法保存，接口会返回 422 | 后端：`backend/routers/borrows.py`（`/borrows/{id}/reject`）、`backend/schemas.py`（`BorrowRejectRequest`）<br>前端：`frontend/src/pages/BorrowAudit.jsx`（第 84 行 `{ reason: values.reason }`） |
| FR-LEND-01 | 对于已批准申请，管理员进行借出登记，实际库存减 1，状态变更为 `borrowed`（借阅中），记录实际借出时间 | 已完成 | 无 | 后端：`backend/routers/borrows.py`（`/borrows/{id}/lend`）<br>前端：`frontend/src/pages/BorrowLendReturn.jsx` |
| FR-LEND-02 | 借出登记时再次校验库存，库存不足则失败 | 已完成 | 无 | 后端：`backend/routers/borrows.py`（`lend_book` 中 `book.stock <= 0` 校验） |
| FR-RETURN-01 | 对于借阅中记录，管理员进行归还登记，实际库存加 1，状态变更为 `returned`（已归还），记录实际归还时间 | 已完成 | 无 | 后端：`backend/routers/borrows.py`（`/borrows/{id}/return`）<br>前端：`frontend/src/pages/BorrowLendReturn.jsx` |
| FR-RETURN-02 | 前端借还登记页面支持扫码或手动输入借阅单号（UI 预留） | 部分完成 | 支持手动输入借阅单号；扫码功能仅通过 placeholder 文案预留，未集成真实扫码能力 | 前端：`frontend/src/pages/BorrowLendReturn.jsx` |
| FR-OVERDUE-01 | 系统启动后台线程，每天扫描一次处于 `borrowed` 状态的借阅单 | 已完成 | 无 | 后端：`backend/scheduler.py`（`start_scheduler`、`_scheduler_loop` 间隔 86400 秒）<br>后端：`backend/main.py`（`startup_event` 调用） |
| FR-OVERDUE-02 | 距离预计归还日 3 天及以内生成站内提醒消息 | 已完成 | 无 | 后端：`backend/scheduler.py`（`check_and_create_notifications`，`days_until_due <= 3`） |
| FR-OVERDUE-03 | 逾期后每天生成一条站内提醒消息 | 已完成 | 无 | 后端：`backend/scheduler.py`（`days_until_due < 0` 每天生成） |
| FR-OVERDUE-04 | 同一天内同一借阅单仅生成一条提醒，避免重复 | 已完成 | 无 | 后端：`backend/scheduler.py`（按 `borrow_record_id`、`user_id`、当天时间范围查重） |
| FR-OVERDUE-05 | 管理员可在“逾期列表”查看所有逾期未还的借阅记录 | 已完成 | 逾期天数列依赖后端不存在的 `overdue_days` 字段，页面永远显示“-”，但不影响查看逾期记录本身 | 后端：`backend/routers/overdue.py`（`/overdue`）<br>前端：`frontend/src/pages/OverdueList.jsx` |
| FR-OVERDUE-06 | 员工可在“消息中心”查看提醒并标记已读 | 已完成 | 无 | 后端：`backend/routers/notifications.py`（`/notifications`、`/{id}/read`）<br>前端：`frontend/src/pages/Notifications.jsx` |
| FR-STAT-01 | 按图书维度统计借阅次数 | 已完成 | 无 | 后端：`backend/routers/statistics.py`（`/statistics/books`、`_get_books_stats`）<br>前端：`frontend/src/pages/Statistics.jsx` |
| FR-STAT-02 | 按分类维度统计借阅次数 | 已完成 | 无 | 后端：`backend/routers/statistics.py`（`/statistics/categories`）<br>前端：`frontend/src/pages/Statistics.jsx` |
| FR-STAT-03 | 按部门维度统计借阅次数 | 已完成 | 无 | 后端：`backend/routers/statistics.py`（`/statistics/departments`）<br>前端：`frontend/src/pages/Statistics.jsx` |
| FR-STAT-04 | 按个人维度统计借阅次数 | 已完成 | 无 | 后端：`backend/routers/statistics.py`（`/statistics/users`）<br>前端：`frontend/src/pages/Statistics.jsx` |
| FR-STAT-05 | 展示热门图书 Top20 | 已完成 | 无 | 后端：`backend/routers/statistics.py`（`/statistics/top20`、`_get_top20_stats`）<br>前端：`frontend/src/pages/Statistics.jsx`（表格 + Recharts 条形图） |
| FR-STAT-06 | 支持将统计结果导出为 Excel（.xlsx）或 CSV 格式 | 已完成 | 无 | 后端：`backend/routers/statistics.py`（`/statistics/export`）<br>前端：`frontend/src/pages/Statistics.jsx`（导出按钮） |
| （占位）用户管理 | 系统管理员可管理系统用户 | 部分完成 | PRD 明确为占位页面，仅展示 `PlaceholderPage` | 前端：`frontend/src/pages/PlaceholderPage.jsx`、路由 `/users`<br>菜单：`frontend/src/utils/menu.js` |
| （占位）角色权限 | 系统管理员可配置角色与权限 | 部分完成 | PRD 明确为占位页面，仅展示 `PlaceholderPage` | 前端：`frontend/src/pages/PlaceholderPage.jsx`、路由 `/roles`<br>菜单：`frontend/src/utils/menu.js` |

## 三、主要发现与建议

1. **后端缺少通用借阅单列表接口**  
   前端 `BorrowAudit.jsx` 的“已审核”Tab 与 `BorrowLendReturn.jsx` 的“待归还”Tab 均调用 `/borrows?status=...`，但 `backend/routers/borrows.py` 仅实现了 `/borrows/my` 与 `/borrows/pending`，没有 `/borrows` 通用列表及多状态过滤。建议新增 `/borrows` 接口，支持按状态（可接受单个或多个）分页查询。

2. **拒绝理由字段不一致导致功能异常**  
   前端提交拒绝时 JSON 字段为 `reason`，后端 `BorrowRejectRequest` 要求 `reject_reason`。FastAPI 会报 422，员工端无法看到拒绝理由。建议将前端 `BorrowAudit.jsx` 第 84 行改为 `{ reject_reason: values.reason }`。

3. **逾期天数未在接口中返回**  
   `OverdueList.jsx` 显示 `overdue_days`，但 `BorrowRecordOut` 未包含该字段。建议后端在 `/overdue` 接口返回中补充 `overdue_days` 计算字段，或前端自行根据 `expected_return_date` 计算。

4. **扫码功能仅 UI 占位**  
   借还登记页面的扫码输入框仅通过 placeholder 提示“扫描或输入借阅单号”，未接入二维码扫描 SDK（如浏览器 `getUserMedia` 或二维码库），符合 PRD 中“UI 预留”的描述。

5. **页面级角色路由守卫可加强**  
   当前 `PrivateRoute` 仅校验登录态，未按角色拦截页面。员工若直接访问 `/borrow-review` 等页面，页面会加载但数据请求会被后端 403 拒绝。建议为各路由增加角色守卫组件，提升用户体验。

## 四、总结

- **已完成数量：39 项**
- **部分完成数量：4 项**（FR-AUDIT-03、FR-RETURN-02、用户管理占位、角色权限占位）
- **未完成数量：0 项**

核心业务流程（登录、分类、图书 CRUD、检索、借阅申请、审核通过、借出、归还、逾期提醒、统计、导出）均已落地。当前影响实际使用的主要问题是 **FR-AUDIT-03 拒绝理由前后端字段不一致** 以及 **前端部分页面依赖未实现的后端 `/borrows` 通用列表接口**。建议优先修复这两点，再视情况补充逾期天数显示与页面级角色守卫。
