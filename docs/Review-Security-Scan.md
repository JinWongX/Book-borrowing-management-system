# 企业图书借阅管理系统安全漏洞扫描报告

> 扫描日期：2026-07-31  
> 扫描范围：前端 `frontend/` + 后端 `backend/` 全链路  
> 验证方式：静态代码审查 + 运行服务动态验证  
> 依据文档：`docs/PRD.md` 安全需求章节、`docs/Technical-Design.md`、`.trae/specs/enterprise-book-borrowing-system/spec.md`

---

## 1. 扫描概述

本次安全审查对企业图书借阅管理系统的前后端代码、配置及运行实例进行了全面检查，重点覆盖 XSS、CSRF、接口鉴权、敏感数据保护、SQL 注入、服务器配置、JWT 安全、文件上传等风险面。

### 1.1 安全需求核对（PRD NFR-SEC）

| 需求编号 | 需求描述 | 实现状态 | 结论 |
|----------|----------|----------|------|
| NFR-SEC-01 | 密码使用 bcrypt 加盐哈希存储 | 已实现 | `backend/auth.py` 使用 bcrypt 正确哈希 |
| NFR-SEC-02 | JWT Token 默认有效期 24 小时 | 已实现 | `ACCESS_TOKEN_EXPIRE_MINUTES = 60*24` |
| NFR-SEC-03 | 后端对所有接口统一权限校验 | 部分实现 | 接口均带鉴权依赖，但存在前端路由越权查看、静态资源未鉴权等问题 |
| NFR-SEC-04 | 生产环境替换默认 SECRET_KEY，通过 .env 管理敏感配置 | **未实现** | SECRET_KEY 硬编码，且无 .env/.gitignore 保护 |

### 1.2 风险等级说明

- **critical**：可直接导致系统完全失陷或大量敏感数据泄露，需立即修复。
- **high**：可导致严重越权、数据篡改或重要凭证泄露，建议短期内修复。
- **medium**：可被利用但影响有限，或需要配合其他漏洞才能造成实质危害。
- **low**：风险较低，多为配置加固或最佳实践类问题。
- **info**：补充信息，供安全基线参考。

---

## 2. 漏洞清单

### 2.1 JWT 签名密钥硬编码（critical）

- **位置**：`backend/config.py:13`
- **问题描述**：`SECRET_KEY: str = "change-me-in-production-this-is-a-demo-secret-key"` 为硬编码默认值，且仓库中不存在 `.env` 文件，`.gitignore` 也未忽略 `.env`。
- **影响范围**：攻击者获取源码或默认配置后，可直接使用同一密钥伪造任意用户（包括 `admin`、`librarian`）的 JWT Token。
- **利用场景**：
  1. 攻击者读取到默认密钥（通过源码泄露、配置错误等）。
  2. 使用 `jwt.encode({"sub": "3"}, SECRET_KEY, "HS256")` 伪造 admin 用户 Token。
  3. 携带伪造 Token 访问 `/api/auth/me`、`/api/overdue`、`/api/books` 等管理接口，成功通过鉴权。
- **动态验证**：已通过本地服务验证，伪造 admin Token 可成功创建图书、查看逾期列表。
- **修复建议**：
  - 从环境变量读取 `SECRET_KEY`，拒绝使用默认值。
  - 生产环境生成强随机密钥（≥ 256 bit）。
  - 将 `.env` 加入 `.gitignore`。

### 2.2 默认种子账号使用弱口令（critical）

- **位置**：`backend/init_db.py:40-42`
- **问题描述**：系统初始化时创建 `employee`/`librarian`/`admin` 三个账号，默认密码均为 `123456`，且无强制修改密码机制。
- **影响范围**：若生产环境直接使用初始化数据库，攻击者可通过默认口令登录任意角色账号，绕过 JWT 伪造直接获得合法 Token。
- **利用场景**：攻击者尝试使用 `admin / 123456` 登录，成功获得高权限 Token。
- **修复建议**：
  - 首次部署后强制修改默认密码。
  - 或在生产环境初始化时跳过默认用户创建。
  - 增加登录失败锁定与密码复杂度策略。

### 2.3 DEBUG 模式默认开启（critical / high）

- **位置**：`backend/config.py:10`、`backend/main.py:31`、`backend/database.py:9`
- **问题描述**：
  - `DEBUG: bool = True` 为默认值，并直接传递给 `FastAPI(debug=settings.DEBUG)`。
  - 数据库引擎启用 `echo=settings.DEBUG`，所有 SQL 语句被打印到日志。
- **影响范围**：生产环境若未修改，会暴露详细的错误堆栈、SQL 日志及 API 文档，辅助攻击者进行信息收集与进一步攻击。
- **利用场景**：访问异常接口获取堆栈信息；读取日志文件获取数据库结构。
- **修复建议**：
  - 默认 `DEBUG=False`。
  - 通过环境变量覆盖，确保生产环境关闭调试与 SQL 回显。

### 2.4 文件上传仅校验扩展名，存在存储型 XSS / 恶意文件上传风险（high）

- **位置**：`backend/routers/books.py:192-214`、`backend/main.py:96-100`
- **问题描述**：
  - `upload-cover` 仅检查文件后缀是否在 `{".jpg", ".jpeg", ".png", ".gif", ".webp"}`，未校验文件头 Magic Bytes、MIME 类型，也未限制文件大小。
  - 上传文件以 UUID 命名并保留原扩展名，通过 `/api/uploads/covers/{filename}` 直接提供下载，无身份校验。
  - FastAPI `StaticFiles` 未配置 `X-Content-Type-Options: nosniff`，浏览器可能进行 MIME 嗅探。
- **影响范围**：攻击者可上传包含 HTML/JS 内容但扩展名为 `.jpg` 的文件，构造存储型 XSS 或诱导下载恶意文件。
- **利用场景**：
  1. 攻击者以图书管理员身份上传文件内容 `<html><body><script>alert('xss')</script></body></html>`、文件名为 `evil.jpg` 的封面。
  2. 后端返回 `/api/uploads/covers/{uuid}.jpg`。
  3. 在某些浏览器或嵌入场景下，该文件被嗅探为 HTML 执行脚本。
- **动态验证**：已成功上传 HTML 内容并作为 `image/jpeg` 访问，确认绕过扩展名校验。
- **修复建议**：
  - 使用 Pillow 等库解析图片，校验宽高及文件头。
  - 限制文件大小。
  - 对上传目录添加身份校验中间件。
  - 配置 `X-Content-Type-Options: nosniff` 与 `Content-Disposition: attachment`。

### 2.5 敏感数据明文传输（high）

- **位置**：`frontend/src/services/request.js:4`、`frontend/src/services/auth.js:7`
- **问题描述**：
  - 前端请求基地址写死 `http://localhost:8000/api`，登录表单以 `application/x-www-form-urlencoded` 明文传输账号密码。
  - JWT Token 存储在 `localStorage` 并随请求以 `Authorization: Bearer <token>` 发送。
- **影响范围**：HTTP 环境下 Token、密码可被中间人截获；`localStorage` 中的 Token 一旦被 XSS 获取即可被盗用。
- **利用场景**：同一网络内的攻击者通过 ARP 欺骗或抓包获取 JWT；通过任意 XSS 漏洞读取 `localStorage.token`。
- **修复建议**：
  - 生产环境全站启用 HTTPS。
  - 考虑将 Token 改为 `httpOnly` Cookie（需配套 CSRF 防护），或对 localStorage Token 增加短期有效期。

### 2.6 API 文档接口默认暴露（high）

- **位置**：`backend/main.py:28-32`
- **问题描述**：FastAPI 默认开启 `/docs`（Swagger UI）与 `/redoc`，当前配置未通过 `docs_url=None` / `redoc_url=None` 关闭。
- **影响范围**：攻击者可直接获取完整 API 路径、参数、响应模型及认证方式，降低漏洞挖掘门槛。
- **利用场景**：访问 `http://<host>/docs` 即可查看并调试所有接口。
- **动态验证**：已确认 `/docs` 可公开访问。
- **修复建议**：
  - 生产环境关闭 `/docs` 与 `/redoc`，或限制内网/IP 访问。

### 2.7 静态上传资源未鉴权（high）

- **位置**：`backend/main.py:96-100`
- **问题描述**：`/api/uploads` 挂载为 `StaticFiles`，未添加任何鉴权中间件。
- **影响范围**：任何知道 URL 的人均可访问上传的文件；若文件名被泄露或猜到，可导致内部图片/恶意文件被任意下载。
- **利用场景**：通过社工、UUID 枚举（虽然 UUID 空间大，但不代表不可行）获取上传文件 URL。
- **修复建议**：
  - 对 `/api/uploads` 增加依赖 `get_current_user` 的鉴权中间件。
  - 或将文件存储在不可通过 Web 直接访问的目录，仅通过带鉴权的接口返回。

### 2.8 缺少安全响应头（high / medium）

- **位置**：`backend/main.py` 全局中间件、异常处理响应
- **问题描述**：未配置 `X-Content-Type-Options`、`X-Frame-Options`、`Content-Security-Policy`、`Strict-Transport-Security` 等安全响应头。
- **影响范围**：
  - 缺少 `X-Content-Type-Options: nosniff` 会加剧文件上传后的 MIME 嗅探 XSS 风险。
  - 缺少 CSP 与 X-Frame-Options 会增加 XSS、Clickjacking 风险。
- **修复建议**：
  - 通过 Starlette 中间件统一添加安全响应头。

### 2.9 CORS 开发配置直接用于生产（medium）

- **位置**：`backend/main.py:34-40`
- **问题描述**：
  - `allow_origins=["http://localhost:3000", "http://localhost:5173"]`、`allow_methods=["*"]`、`allow_headers=["*"]`。
  - 同时开启 `allow_credentials=True`。
- **影响范围**：开发配置本身风险可控（不允许任意 Origin），但若部署时未替换为生产域名，仍可能导致本地恶意站点利用已登录会话发起跨域请求。
- **修复建议**：
  - 通过环境变量配置 `ALLOW_ORIGINS`，生产环境仅允许指定 HTTPS 域名。
  - 限制 `allow_methods` 与 `allow_headers` 为实际需要的值。

### 2.10 存储型 XSS 潜在风险（medium）

- **位置**：
  - `backend/routers/books.py` 创建/更新图书字段（title、author、publisher、location、cover_url 等）
  - `backend/routers/borrows.py:151` `reject_reason`
  - `frontend/src/pages/BookDetail.jsx:137`、`frontend/src/pages/MyBorrows.jsx:98`、`frontend/src/pages/BorrowAudit.jsx:143`
- **问题描述**：
  - 后端未对用户输入及富文本字段做转义或过滤，直接原样存入数据库并返回。
  - 当前前端使用 React JSX，文本插值默认转义 HTML，因此 `<script>alert(1)</script>` 在表格/描述中不会直接执行。
  - 但 `cover_url` 被直接用于 `<img src={cover_url}>`，若 URL 为 `javascript:` 协议或带内联事件处理器，在某些渲染场景下可能触发脚本执行；且一旦未来代码使用 `dangerouslySetInnerHTML` 或渲染 markdown/html，存储的恶意脚本将直接触发。
- **影响范围**：当前版本以反射/存储型 XSS 风险为主，主要威胁来自 `cover_url` 与后续功能扩展引入的不安全渲染。
- **动态验证**：已通过接口将 `<script>alert(1)</script>` 存入 `reject_reason`，并以 `javascript:alert(1)` 存入 `cover_url`。
- **修复建议**：
  - 后端对返回给前端的文本字段做 HTML 转义或白名单过滤（也可依赖 React，但需统一约定）。
  - 对 `cover_url` 做 URL 协议白名单校验（仅允许 `http/https`）。
  - 禁止在后续功能中使用 `dangerouslySetInnerHTML`。

### 2.11 JWT Token 存储于 localStorage，易受 XSS 窃取（medium）

- **位置**：`frontend/src/contexts/AuthContext.jsx:33`、`frontend/src/services/request.js:13`
- **问题描述**：登录成功后 Token 写入 `localStorage`，请求拦截器从 `localStorage` 读取并放入 Header。
- **影响范围**：若系统存在任意 XSS 漏洞，攻击脚本可直接读取 Token 并冒充用户。
- **修复建议**：
  - 评估使用 `httpOnly` Cookie + CSRF Token 的方案。
  - 若继续使用 localStorage，需严格控制 XSS 入口，缩短 Token 有效期并配合刷新令牌。

### 2.12 缺少 CSRF 防护机制（low / info）

- **位置**：前后端均未显式配置 CSRF Token
- **问题描述**：当前认证方式为 `Authorization: Bearer <token>`，属于自定义请求头，浏览器非简单请求会自动触发 CORS 预检，传统 CSRF（如自动提交的 form/img 标签）无法携带该 Header，因此当前架构下 CSRF 风险较低。但系统未为未来可能引入的 Cookie 认证或表单提交预留 CSRF 防护。
- **影响范围**：当前低风险；若后续改为 Cookie 会话，风险将升高。
- **修复建议**：
  - 若改为 Cookie 认证，使用双重提交 Cookie 或 Synchronizer Token 模式。

### 2.13 缺乏速率限制与账户锁定（medium）

- **位置**：`backend/routers/auth.py:14-29`
- **问题描述**：登录接口无请求频率限制、无账户锁定、无验证码，可被暴力破解。
- **影响范围**：攻击者可自动化尝试弱口令或默认口令。
- **修复建议**：
  - 对 `/auth/login` 增加 IP/账号级速率限制（如 `slowapi`）。
  - 连续失败多次后锁定账号或要求验证码。

### 2.14 并发场景下库存扣减存在竞态条件（medium）

- **位置**：`backend/routers/borrows.py:56-60`、`backend/routers/borrows.py:176-182`
- **问题描述**：`create_borrow` 与 `lend_book` 先查询库存再判断/扣减，未使用数据库行锁或事务隔离级别控制。
- **影响范围**：高并发下可能出现超借（库存为 0 时仍成功创建借阅或借出）。
- **修复建议**：
  - 使用 `SELECT ... FOR UPDATE` 锁定图书行。
  - 或在应用层引入分布式锁/乐观锁。

### 2.15 缺少版本控制忽略配置，敏感文件可能入仓（medium）

- **位置**：项目根目录、backend 目录缺少 `.gitignore`
- **问题描述**：
  - 未发现根目录 `.gitignore` 与 `backend/.gitignore`。
  - `database.sqlite`、`.env`、`backend/uploads/`、`__pycache__/` 等敏感文件可能被误提交。
- **影响范围**：仓库泄露将直接暴露数据库、配置与上传文件。
- **修复建议**：
  - 在项目根目录创建 `.gitignore`，忽略 `.env`、`*.sqlite`、`backend/uploads/`、`__pycache__/`、`dist/`、`node_modules/` 等。

### 2.16 前端路由守卫仅校验登录态，未校验角色（low）

- **位置**：`frontend/src/components/PrivateRoute.jsx`、`frontend/src/App.jsx`
- **问题描述**：`PrivateRoute` 只判断 `isAuthenticated`，不判断角色。员工通过 URL 可直接进入 `/books/new`、`/borrow-review`、`/overdue` 等页面。
- **影响范围**：
  - 页面组件中部分有前端角色判断（如 `BookForm`），会直接显示“无权限”。
  - 但 `BorrowAudit`、`OverdueList`、`Statistics` 等未做前端角色拦截，会加载页面并在调用后端接口时才收到 403，造成较差体验及短暂的信息暴露（如空表格表头）。
- **修复建议**：
  - 在 `PrivateRoute` 或路由定义中增加 `requiredRole` 属性，无角色权限直接重定向或显示无权限页面。

### 2.17 缺少操作审计日志（low）

- **位置**：`backend/routers/*.py`
- **问题描述**：图书增删改、借阅审核、借还登记等关键操作均未记录操作人、时间、IP 及变更内容。
- **影响范围**：发生安全事件后难以溯源。
- **修复建议**：
  - 增加审计中间件或在关键接口手动记录审计日志。

### 2.18 SQLite 生产化风险（low / info）

- **位置**：`backend/database.py:6-10`、`backend/config.py:12`
- **问题描述**：
  - 使用 SQLite 单文件数据库，`check_same_thread=False` 在单进程多线程场景下存在并发风险。
  - 数据库文件位于项目目录，若被静态服务器或备份机制暴露则可直接下载。
- **影响范围**：高并发或错误部署时可能导致数据损坏或泄露。
- **修复建议**：
  - 生产环境迁移至 PostgreSQL/MySQL。
  - 若继续使用 SQLite，确保数据库文件不在 Web 根目录，并配置严格文件权限。

### 2.19 JWT 设计层面加固点（info）

- **位置**：`backend/auth.py:28-41`
- **问题描述**：
  - Token 载荷仅含 `sub` 与 `exp`，缺少 `iss`、`aud`、`iat` 等声明。
  - 无刷新令牌与主动注销机制。
- **影响范围**：Token 被盗后可在有效期内持续使用；无法主动吊销。
- **修复建议**：
  - 增加 `iss`、`aud`、`iat`、`jti` 声明，实现 Token 黑名单或短期 Access Token + Refresh Token 机制。

---

## 3. 各等级漏洞统计

| 等级 | 数量 |
|------|------|
| critical | 3 |
| high | 5 |
| medium | 7 |
| low | 3 |
| info | 1 |
| **合计** | **19** |

### 按风险面分布

| 风险面 | 涉及漏洞 |
|--------|----------|
| JWT/认证 | 2.1、2.2、2.5、2.11、2.13、2.19 |
| 服务器/部署配置 | 2.3、2.6、2.7、2.8、2.9、2.15、2.18 |
| 文件上传/静态资源 | 2.4、2.7 |
| XSS/前端安全 | 2.10、2.11、2.16 |
| 业务逻辑/权限 | 2.14、2.17 |
| CSRF | 2.12 |

---

## 4. 最需优先修复的 TOP 5 风险

1. **JWT 签名密钥硬编码（critical）**
   - 这是当前最严重的漏洞，攻击者无需任何凭证即可伪造任意用户 Token，完全绕过认证体系。
   - 建议立即改为从环境变量读取强随机密钥，并禁止默认值。

2. **默认种子账号弱口令（critical）**
   - `admin/librarian/employee` 默认密码均为 `123456`，可直接登录高权限账号。
   - 建议生产部署强制修改默认密码或移除默认账号。

3. **DEBUG 模式默认开启（critical / high）**
   - 会暴露堆栈、SQL 日志与 API 文档，极大降低攻击门槛。
   - 建议默认 `DEBUG=False`，并通过环境变量控制。

4. **文件上传仅校验扩展名（high）**
   - 已验证可上传 HTML 内容并作为图片访问，存在存储型 XSS 与恶意文件分发风险。
   - 建议增加文件内容校验、大小限制、安全响应头与访问鉴权。

5. **敏感数据明文传输（high）**
   - HTTP 下密码与 Token 可被中间人截获，且 Token 存于 localStorage 易被 XSS 窃取。
   - 建议生产环境启用 HTTPS，并评估使用 `httpOnly` Cookie + CSRF Token 方案。

---

## 5. 验证记录

### 5.1 已完成的动态验证

- 伪造 admin JWT Token 成功访问 `/api/auth/me`、`/api/overdue`、`POST /api/books`。
- 员工 Token 访问管理员接口均返回 403，权限校验正常。
- 在 `keyword` 参数中注入 `' OR '1'='1`，返回结果为空，未触发 SQL 注入，参数化查询有效。
- 成功上传内容包含 `<script>` 但扩展名为 `.jpg` 的文件，并通过 `/api/uploads/covers/{uuid}.jpg` 以 `image/jpeg` 访问到原始 HTML 内容。
- `/docs` 无需认证即可访问。

### 5.2 未验证但已静态确认的风险

- 生产环境若未改 DEBUG/CORS/SECRET_KEY 将叠加放大上述风险。
- 缺少安全响应头、审计日志、速率限制等属于配置与工程实践问题。

---

## 6. 合规性与需求差距

| 需求 | 状态 | 说明 |
|------|------|------|
| NFR-SEC-01 密码 bcrypt 哈希 | 符合 | 后端正确实现 |
| NFR-SEC-02 Token 24h 有效期 | 符合 | 已配置 |
| NFR-SEC-03 接口统一权限校验 | 基本符合 | 接口层面已校验，但静态资源、前端路由存在缺口 |
| NFR-SEC-04 生产替换 SECRET_KEY 并通过 .env 管理 | **不符合** | 硬编码密钥，且无 .env 与 .gitignore 保护 |

---

## 7. 修复建议汇总

### 立即执行（critical / high）

1. 将 `SECRET_KEY`、`DEBUG`、`DATABASE_URL`、`ALLOW_ORIGINS` 等敏感配置迁移至环境变量。
2. 删除或强制修改默认种子账号密码。
3. 默认关闭 `DEBUG` 与 SQL 回显，生产环境关闭 `/docs`、`/redoc`。
4. 对上传文件进行内容类型校验、大小限制，并对 `/api/uploads` 增加鉴权。
5. 生产环境启用 HTTPS。

### 短期执行（medium）

6. 统一添加安全响应头（CSP、X-Content-Type-Options、X-Frame-Options、HSTS）。
7. 对 `cover_url`、`reject_reason` 等字段做 URL/内容白名单校验。
8. 增加登录速率限制与账户锁定。
9. 为关键数据库操作增加行锁，防止库存竞态。
10. 创建 `.gitignore` 保护敏感文件。

### 长期执行（low / info）

11. 引入审计日志。
12. 评估迁移至 PostgreSQL/MySQL。
13. 引入 Refresh Token 与 Token 黑名单机制。
14. 前端路由增加角色守卫。

---

*报告结束。*
