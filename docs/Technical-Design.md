# 企业图书借阅管理系统 - 技术方案文档

> 版本：v1.0  
> 日期：2026-07-31  
> 状态：已落地实现

---

## 1. 系统架构设计

### 1.1 总体架构

系统采用前后端分离架构：

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端浏览器                          │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP
┌─────────────────────────▼───────────────────────────────────┐
│                      前端（Frontend）                        │
│  Vite + React 18 + React Router 6 + Ant Design 5 + Recharts │
│  职责：UI 渲染、路由守卫、权限菜单、图表展示、文件导出        │
└─────────────────────────┬───────────────────────────────────┘
                          │ RESTful API (JSON)
┌─────────────────────────▼───────────────────────────────────┐
│                      后端（Backend）                         │
│  FastAPI + SQLAlchemy + SQLite + JWT + bcrypt + APScheduler │
│  职责：业务接口、权限校验、数据持久化、定时任务、报表导出     │
└─────────────────────────┬───────────────────────────────────┘
                          │ SQLAlchemy ORM
┌─────────────────────────▼───────────────────────────────────┐
│                      数据库                                  │
│              SQLite 单文件（backend/database.sqlite）        │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 架构分层说明

| 层级 | 技术/位置 | 说明 |
|------|-----------|------|
| 表现层 | `frontend/src/pages`、`frontend/src/components` | React 页面与公共组件 |
| 路由层 | `frontend/src/App.jsx`、`PrivateRoute.jsx` | 前端路由与登录态保护 |
| 状态层 | `frontend/src/contexts/AuthContext.jsx` | 全局用户认证状态 |
| 服务层 | `frontend/src/services/*.js` | Axios 封装与 API 调用 |
| API 层 | `backend/routers/*.py` | FastAPI 路由分组 |
| 业务/鉴权层 | `backend/auth.py` | JWT 签发、校验、角色鉴权 |
| 数据层 | `backend/models.py`、`backend/database.py` | SQLAlchemy 模型与会话管理 |
| 任务层 | `backend/scheduler.py` | 逾期提醒后台定时任务 |

---

## 2. 技术选型

### 2.1 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.2.0 | 组件化 UI 框架 |
| React DOM | 18.2.0 | 渲染器 |
| React Router DOM | 6.30.4 | 单页应用路由 |
| Ant Design | 5.29.3 | UI 组件库 |
| Axios | 1.19.0 | HTTP 请求 |
| Recharts | 3.10.1 | 统计图表 |
| Vite | 4.4.5 | 构建工具与开发服务器 |
| ESLint | 8.45.0 | 代码规范 |

### 2.2 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Python | 3.10+ | 后端开发语言 |
| FastAPI | 0.111.0 | Web 框架 |
| Uvicorn | 0.30.1 | ASGI 服务器 |
| SQLAlchemy | 2.0.31 | ORM |
| Pydantic | 2.7.4 | 数据校验与序列化 |
| pydantic-settings | 2.3.4 | 配置管理 |
| python-jose | 3.3.0 | JWT 加解密 |
| passlib + bcrypt | 1.7.4 / 4.0.1 | 密码哈希 |
| python-multipart | 0.0.9 | 文件上传解析 |
| openpyxl | 3.1.5 | Excel 导出 |

### 2.3 数据库

- **SQLite**：单文件关系型数据库，零部署成本，适合企业内网中小规模使用。
- **连接字符串**：`sqlite:///./backend/database.sqlite`

---

## 3. 数据库设计说明

### 3.1 ER 图描述

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   roles     │       │   users     │       │ borrow_records│
│-------------│       │-------------│       │-------------│
│ id (PK)     │1     *│ id (PK)     │1     *│ id (PK)     │
│ name        │───────│ username    │───────│ book_id(FK) │
│ description │       │ password_hash│      │ user_id(FK) │
└─────────────┘       │ role_id(FK) │       │ expected_...│
                      │ department  │       │ actual_lend │
                      │ created_at  │       │ actual_return│
                      └─────────────┘       │ status      │
                            *│               │ reject_reason│
                             │               │ created_at  │
                             │               └──────┬──────┘
                             │                      *│
                             ▼                       │
                      ┌─────────────┐               │
                      │notifications│*──────────────┘
                      │-------------│
                      │ id (PK)     │
                      │ user_id(FK) │
                      │ borrow_record_id(FK)
                      │ message     │
                      │ is_read     │
                      │ created_at  │
                      └─────────────┘

┌─────────────┐       ┌─────────────┐
│  categories │1     *│    books    │
│-------------│       │-------------│
│ id (PK)     │───────│ id (PK)     │
│ name        │       │ title       │
│ parent_id(FK)│      │ author      │
│ path        │       │ isbn        │
│ created_at  │       │ publisher   │
└─────────────┘       │ category_id │
                      │ stock       │
                      │ location    │
                      │ cover_url   │
                      │ created_at  │
                      └─────────────┘
```

### 3.2 各表字段说明

#### roles（角色表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK | 主键 |
| name | VARCHAR(50) | UNIQUE, NOT NULL | 角色名：`employee` / `librarian` / `admin` |
| description | VARCHAR(255) | NULL | 角色描述 |

#### users（用户表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK | 主键 |
| username | VARCHAR(100) | UNIQUE, NOT NULL | 登录账号 |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt 哈希密码 |
| role_id | INTEGER | FK → roles.id, NOT NULL | 角色 ID |
| department | VARCHAR(100) | NULL | 所属部门 |
| created_at | DATETIME | NOT NULL, DEFAULT now | 创建时间 |

#### categories（图书分类表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK | 主键 |
| name | VARCHAR(100) | NOT NULL | 分类名称 |
| parent_id | INTEGER | FK → categories.id, NULL | 父分类 ID |
| path | VARCHAR(500) | NULL, INDEX | 层级路径，如 `/1/2/3/` |
| created_at | DATETIME | NOT NULL, DEFAULT now | 创建时间 |

#### books（图书表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK | 主键 |
| title | VARCHAR(255) | NOT NULL, INDEX | 书名 |
| author | VARCHAR(255) | NULL, INDEX | 作者 |
| isbn | VARCHAR(50) | UNIQUE, NOT NULL, INDEX | ISBN |
| publisher | VARCHAR(255) | NULL | 出版社 |
| category_id | INTEGER | FK → categories.id, NULL, INDEX | 分类 ID |
| stock | INTEGER | NOT NULL, DEFAULT 0 | 库存数量 |
| location | VARCHAR(255) | NULL | 上架位置 |
| cover_url | VARCHAR(500) | NULL | 封面图 URL |
| created_at | DATETIME | NOT NULL, DEFAULT now | 创建时间 |

#### borrow_records（借阅记录表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK | 主键 |
| book_id | INTEGER | FK → books.id, NOT NULL, INDEX | 图书 ID |
| user_id | INTEGER | FK → users.id, NOT NULL, INDEX | 用户 ID |
| expected_return_date | DATETIME | NOT NULL | 预计归还日期 |
| actual_lend_date | DATETIME | NULL | 实际借出时间 |
| actual_return_date | DATETIME | NULL | 实际归还时间 |
| status | Enum | NOT NULL, INDEX | `pending`/`approved`/`borrowed`/`returned`/`rejected` |
| reject_reason | TEXT | NULL | 拒绝理由 |
| created_at | DATETIME | NOT NULL, DEFAULT now | 创建时间 |

#### notifications（消息提醒表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK | 主键 |
| user_id | INTEGER | FK → users.id, NOT NULL, INDEX | 接收用户 ID |
| borrow_record_id | INTEGER | FK → borrow_records.id, NULL | 关联借阅单 |
| message | TEXT | NOT NULL | 消息内容 |
| is_read | INTEGER | NOT NULL, DEFAULT 0 | 是否已读（0/1） |
| created_at | DATETIME | NOT NULL, DEFAULT now | 创建时间 |

---

## 4. 接口设计

统一响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

API 前缀：`/api`

### 4.1 认证模块（/api/auth）

| 方法 | 路径 | 说明 | 请求 | 响应 |
|------|------|------|------|------|
| POST | `/auth/login` | 账号密码登录 | `username`, `password` (form-data) | `{ access_token, token_type }` |
| GET | `/auth/me` | 获取当前登录用户信息 | Bearer Token | `UserOut` |

### 4.2 分类模块（/api/categories）

| 方法 | 路径 | 说明 | 请求 | 响应 |
|------|------|------|------|------|
| GET | `/categories` | 获取分类树 | - | `CategoryOut[]` 树形结构 |
| POST | `/categories` | 新增分类 | `{ name, parent_id? }` | `CategoryOut` |
| PUT | `/categories/{id}` | 编辑分类 | `{ name?, parent_id? }` | `CategoryOut` |
| DELETE | `/categories/{id}` | 删除分类 | - | 删除成功消息 |

### 4.3 图书模块（/api/books）

| 方法 | 路径 | 说明 | 请求 | 响应 |
|------|------|------|------|------|
| GET | `/books` | 图书列表/搜索 | `page`, `page_size`, `category_id`, `keyword` | `BookListResponse` |
| GET | `/books/{id}` | 图书详情 | - | `BookOut` |
| POST | `/books` | 新增图书 | `BookCreate` | `BookOut` |
| PUT | `/books/{id}` | 编辑图书 | `BookUpdate` | `BookOut` |
| DELETE | `/books/{id}` | 删除图书 | - | 删除成功消息 |
| POST | `/books/upload-cover` | 上传封面 | `file` (multipart) | `{ url }` |

### 4.4 借阅模块（/api/borrows）

| 方法 | 路径 | 说明 | 请求 | 响应 |
|------|------|------|------|------|
| POST | `/borrows` | 发起借阅申请 | `{ book_id, expected_return_date }` | `BorrowRecordOut` |
| GET | `/borrows/my` | 我的借阅列表 | `page`, `page_size`, `status` | `BorrowRecordListResponse` |
| GET | `/borrows/pending` | 待审核列表（管理员） | `page`, `page_size` | `BorrowRecordListResponse` |
| POST | `/borrows/{id}/approve` | 通过申请 | - | `BorrowRecordOut` |
| POST | `/borrows/{id}/reject` | 拒绝申请 | `{ reject_reason }` | `BorrowRecordOut` |
| POST | `/borrows/{id}/lend` | 借出登记 | - | `BorrowRecordOut` |
| POST | `/borrows/{id}/return` | 归还登记 | - | `BorrowRecordOut` |

### 4.5 消息模块（/api/notifications）

| 方法 | 路径 | 说明 | 请求 | 响应 |
|------|------|------|------|------|
| GET | `/notifications` | 消息列表 | `page`, `page_size`, `unread_only` | `{ items, pagination, unread_count }` |
| POST | `/notifications/{id}/read` | 标记已读 | - | `NotificationOut` |

### 4.6 逾期模块（/api/overdue）

| 方法 | 路径 | 说明 | 请求 | 响应 |
|------|------|------|------|------|
| GET | `/overdue` | 逾期列表（管理员） | `page`, `page_size` | `BorrowRecordListResponse` |

### 4.7 统计模块（/api/statistics）

| 方法 | 路径 | 说明 | 请求 | 响应 |
|------|------|------|------|------|
| GET | `/statistics/books` | 按图书统计 | - | `StatisticListResponse` |
| GET | `/statistics/categories` | 按分类统计 | - | `StatisticListResponse` |
| GET | `/statistics/departments` | 按部门统计 | - | `StatisticListResponse` |
| GET | `/statistics/users` | 按用户统计 | - | `StatisticListResponse` |
| GET | `/statistics/top20` | 热门图书 Top20 | - | `StatisticListResponse` |
| GET | `/statistics/export` | 导出报表 | `type`, `format` (excel/csv) | 文件流 |

### 4.8 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 服务健康检查 |

---

## 5. 部署说明

### 5.1 环境准备

- Python 3.10+
- Node.js 18+

### 5.2 后端部署

1. 进入后端目录：

```bash
cd backend
```

2. 创建并激活虚拟环境（推荐）：

```bash
python -m venv venv
venv\Scripts\activate  # Windows
```

3. 安装依赖：

```bash
pip install -r requirements.txt
```

4. 初始化数据库：

```bash
python init_db.py
```

5. 启动服务：

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

服务访问地址：`http://localhost:8000`

API 文档（自动生成）：`http://localhost:8000/docs`

### 5.3 前端部署

1. 进入前端目录：

```bash
cd frontend
```

2. 安装依赖：

```bash
npm install
```

3. 开发模式启动：

```bash
npm run dev
```

访问地址：`http://localhost:5173`

4. 生产构建：

```bash
npm run build
```

构建产物位于 `frontend/dist/`，可部署到任意静态服务器。

### 5.4 生产环境注意事项

- 复制 `backend/.env.example` 为 `backend/.env` 并填入真实值：

```env
SECRET_KEY=your-strong-random-secret-key-change-in-production
DEBUG=False
DATABASE_URL=sqlite:///./backend/database.sqlite
ALLOW_ORIGINS=https://book.example.com
INITIAL_PASSWORD_EMPLOYEE=change-me
INITIAL_PASSWORD_LIBRARIAN=change-me
INITIAL_PASSWORD_ADMIN=change-me
```

- 关闭跨域白名单中的开发地址，仅允许生产 HTTPS 域名。
- 使用 HTTPS 部署前后端，确保 Token 与密码传输安全。
- 生产环境认证方案：当前前端使用 `localStorage` 存储 JWT 仅为开发/演示便利，正式上线必须改为 `httpOnly` Cookie + CSRF Token，或配合短期 Access Token + Refresh Token 机制，并严格防控 XSS 入口。
- 首次初始化数据库后，立即修改种子账号密码或删除默认账号。
- 定期备份 `backend/database.sqlite` 文件。
- 如需更高并发，可将 SQLite 迁移至 PostgreSQL/MySQL，仅调整 `DATABASE_URL` 即可。
