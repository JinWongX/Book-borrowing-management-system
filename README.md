# 企业图书借阅管理系统

一套面向企业图书角的全流程线上化管理平台，支持图书信息维护、分类管理、借阅申请、审核、借还登记、逾期提醒、统计报表与 RBAC 权限控制。

---

## 功能特性

- **图书信息管理**：维护书名、作者、ISBN、出版社、分类、库存数量、上架位置、封面图。
- **图书分类管理**：支持多级分类树（如 `技术/编程语言/Java`），可增删改查。
- **图书检索**：按书名、作者、ISBN、分类多维度模糊搜索，支持分页。
- **借阅申请**：员工在线发起借阅申请，选择图书与预计归还日期。
- **借阅审核**：图书管理员审核申请，可拒绝并填写理由。
- **借还登记**：支持手动输入或摄像头扫码登记借出/归还，自动更新库存与借阅状态。
- **逾期提醒**：到期前 3 天站内提醒，逾期后每天提醒，管理员可查看逾期列表。
- **借阅统计**：按图书、分类、部门、个人统计借阅次数，展示热门图书 Top20。
- **用户登录与权限**：基于角色的访问控制（RBAC），支持员工、图书管理员、系统管理员三种角色，不同角色展示不同菜单与数据范围。
- **统计报表与导出**：统计看板包含表格与图表，支持导出 Excel / CSV。
- **用户与角色管理**：系统管理员可进行用户增删改查、状态启停、批量操作，以及角色创建、编辑、权限配置与关联用户。

---

## 技术栈

### 后端

- [Python 3.11+](https://www.python.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [SQLAlchemy 2.0](https://www.sqlalchemy.org/) + SQLite
- [Pydantic](https://docs.pydantic.dev/)
- [Pytest](https://docs.pytest.org/)

### 前端

- [React 18](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Ant Design 5](https://ant.design/)
- [React Router 6](https://reactrouter.com/)
- [Recharts](https://recharts.org/)
- [Vitest](https://vitest.dev/)

---

## 目录结构

```text
.
├── backend/                  # 后端服务
│   ├── auth/                 # JWT 认证与密码工具
│   ├── routers/              # API 路由
│   ├── models.py             # SQLAlchemy 数据模型
│   ├── schemas.py            # Pydantic 数据校验
│   ├── database.py           # 数据库连接与会话
│   ├── config.py             # 配置与环境变量
│   ├── init_db.py            # 数据库初始化与种子数据
│   ├── main.py               # FastAPI 应用入口
│   ├── scheduler.py          # 逾期提醒定时任务
│   ├── tests/                # pytest 测试用例
│   └── requirements.txt      # Python 依赖
├── frontend/                 # 前端应用
│   ├── src/
│   │   ├── pages/            # 页面组件
│   │   ├── components/       # 通用组件
│   │   ├── services/         # API 请求封装
│   │   ├── contexts/         # React Context
│   │   ├── hooks/            # 自定义 Hooks
│   │   ├── utils/            # 工具函数与菜单配置
│   │   ├── App.jsx           # 路由与布局
│   │   └── main.jsx          # 应用入口
│   ├── public/               # 静态资源
│   ├── tests/                # Vitest 测试用例
│   └── package.json          # Node 依赖与脚本
├── docs/                     # 项目文档
│   ├── PRD.md                # 产品需求文档
│   ├── Technical-Design.md   # 技术方案文档
│   ├── Test-Cases.md         # 测试用例
│   └── Test-Report.md        # 测试报告
├── scripts/                  # 本地辅助脚本
│   ├── run-tests.ps1         # Windows 一键测试
│   └── run-tests.sh          # Linux/macOS 一键测试
├── .github/workflows/ci.yml  # GitHub Actions CI
├── TESTING.md                # 测试与 CI/CD 说明
└── README.md                 # 本文件
```

---

## 快速开始

### 环境要求

- Python 3.11+
- Node.js 16+（推荐 18 / 20）
- npm 或 yarn

### 1. 进入项目目录

```bash
cd "Book borrowing management system"
```

### 2. 启动后端

```bash
cd backend

# 建议使用虚拟环境
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 初始化数据库（首次运行或需要重置数据时执行）
python init_db.py

# 启动开发服务器
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

后端默认地址：http://127.0.0.1:8000

### 3. 启动前端

在另一个终端中执行：

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端默认地址：http://127.0.0.1:5173/

### 4. 访问系统

打开浏览器访问 http://127.0.0.1:5173/，使用下方默认账号登录。

---

## 默认账号密码

数据库初始化时会自动创建以下种子账号：

| 角色 | 账号 | 密码 | 主要权限 |
|---|---|---|---|
| 员工 | `employee` | `123456` | 浏览图书、发起借阅、查看我的借阅 |
| 图书管理员 | `librarian` | `123456` | 图书维护、分类管理、借阅审核、借还登记、逾期列表、统计报表 |
| 系统管理员 | `admin` | `123456` | 全部权限，含用户管理、角色权限配置 |

> 生产环境首次启动前，请在 `backend/.env` 中设置 `INITIAL_PASSWORD_*` 或使用强密码。

---

## 测试

详细的测试命令、覆盖率门禁与 CI/CD 说明请查看 [TESTING.md](./TESTING.md)。

快速运行：

```powershell
# Windows
.\scripts\run-tests.ps1
```

```bash
# Linux / macOS
chmod +x scripts/run-tests.sh
./scripts/run-tests.sh
```

---

## 生产部署要点

1. **数据库**：默认使用 SQLite，适合轻量部署。生产环境建议迁移至 PostgreSQL / MySQL，并修改 `DATABASE_URL`。
2. **JWT 密钥**：在 `backend/.env` 中设置固定且足够强度的 `SECRET_KEY`。
3. **初始密码**：在 `backend/.env` 中设置 `INITIAL_PASSWORD_EMPLOYEE`、`INITIAL_PASSWORD_LIBRARIAN`、`INITIAL_PASSWORD_ADMIN`。
4. **CORS**：在 `backend/.env` 中配置 `ALLOW_ORIGINS` 为实际前端域名。
5. **前端构建**：
   ```bash
   cd frontend
   npm run build
   ```
   构建产物位于 `frontend/dist/`，可由 Nginx 等静态服务器托管。

---

## 相关文档

| 文档 | 说明 |
|---|---|
| [docs/PRD.md](./docs/PRD.md) | 产品需求文档 |
| [docs/Technical-Design.md](./docs/Technical-Design.md) | 技术方案文档 |
| [docs/Test-Cases.md](./docs/Test-Cases.md) | 测试用例 |
| [docs/Test-Report.md](./docs/Test-Report.md) | 测试报告 |
| [TESTING.md](./TESTING.md) | 测试与 CI/CD 说明 |

---

## 开源协议

本项目仅供学习与企业内部使用，转载请注明出处。
