# 企业图书借阅管理系统 - 全量测试覆盖率最终报告

> 生成日期：2026-08-05  
> 报告范围：前端、后端、API、功能/业务流程测试  
> 质量门禁：后端语句 ≥95%、分支 ≥90%；前端语句 ≥95%、分支 ≥90%、函数 ≥85%

---

## 1. 测试覆盖率基线

基线报告位于：
- [Coverage-Baseline-Backend.md](./Coverage-Baseline-Backend.md)
- [Coverage-Baseline-Frontend.md](./Coverage-Baseline-Frontend.md)

| 项目 | 基线用例数 | 基线语句覆盖率 | 基线分支覆盖率 |
|---|---|---|---|
| 后端 | 24 | 90% | 87% |
| 前端 | 18 | 约 95% | 约 78% |

---

## 2. 后端测试最终结果

### 2.1 执行命令

```bash
pytest backend/tests/ -v
pytest --cov=backend --cov-branch --cov-report=term-missing backend/tests/
```

### 2.2 测试结果

| 指标 | 数值 |
|---|---|
| 测试文件数 | 2 |
| 用例总数 | **73** |
| 通过 | **73 passed** |
| 失败 | 0 |
| 语句覆盖率 | **97.4%** |
| 分支覆盖率 | **92.3%** |

详细报告：[Coverage-Final-Backend.md](./Coverage-Final-Backend.md)

---

## 3. 前端测试最终结果

### 3.1 执行命令

```bash
cd frontend
npm run test -- --coverage
```

### 3.2 测试结果

| 指标 | 数值 |
|---|---|
| 测试文件数 | 23 |
| 用例总数 | **170** |
| 通过 | **170 passed** |
| 失败 | 0 |
| 语句覆盖率 | **99.34%** |
| 分支覆盖率 | **91.69%** |
| 函数覆盖率 | **92.2%** |
| 行覆盖率 | **99.34%** |

详细报告：[Coverage-Final-Frontend.md](./Coverage-Final-Frontend.md)

---

## 4. 功能/业务流程测试

端到端功能测试文件：`frontend/src/tests/functional-flows.test.jsx`

覆盖的 7 个核心业务流程：
1. 员工登录 → 图书检索 → 查看详情 → 提交借阅申请 → 查看我的借阅
2. 图书管理员登录 → 借阅审核 → 通过申请 → 借出登记 → 归还登记
3. 图书管理员登录 → 拒绝借阅申请（填写理由）
4. 员工登录 → 消息中心 → 标记已读
5. 图书管理员登录 → 分类管理 → 新增/编辑/删除分类
6. 图书管理员登录 → 图书管理 → 新增/编辑/删除图书
7. 系统管理员登录 → 统计报表 → 导出 Excel

功能测试已通过，包含在前端 170 个用例中。

---

## 5. API 测试覆盖情况

后端所有对外暴露接口均已纳入测试：

| 模块 | 接口数量 | 测试覆盖情况 |
|---|---|---|
| auth.py | 2 | 100% |
| categories.py | 7 | 100% |
| books.py | 9 | 100% |
| borrows.py | 10 | 100% |
| notifications.py | 3 | 100% |
| overdue.py | 1 | 100% |
| statistics.py | 6 | 100% |

覆盖场景包括：正常请求、参数异常、权限异常、资源不存在、业务状态非法、边界条件。

---

## 6. 质量门禁达成情况

| 项目 | 指标 | 目标 | 实际 | 状态 |
|---|---|---|---|---|
| 后端 | 语句覆盖率 | ≥95% | 97.4% | ✅ |
| 后端 | 分支覆盖率 | ≥90% | 92.3% | ✅ |
| 前端 | 语句覆盖率 | ≥95% | 99.34% | ✅ |
| 前端 | 分支覆盖率 | ≥90% | 91.69% | ✅ |
| 前端 | 函数覆盖率 | ≥85% | 92.2% | ✅ |
| API | 接口覆盖率 | 100% | 100% | ✅ |
| 功能测试 | 核心流程 | 7 条 | 7 条 | ✅ |

---

## 7. CI/CD 与自动化门禁

已接入配置：
- GitHub Actions：`.github/workflows/ci.yml`
- 本地一键脚本：`scripts/run-tests.ps1`、`scripts/run-tests.sh`
- 后端覆盖率配置：`backend/.coveragerc`
- 前端覆盖率配置：`frontend/vite.config.js`

CI/CD 触发条件：push / pull_request 到 main 或 master 分支。

门禁规则：
- 后端：statements ≥95%，branches ≥90%
- 前端：statements ≥95%，branches ≥90%，functions ≥85%

使用说明见：[TESTING.md](../TESTING.md)

---

## 8. 未覆盖代码说明

少量代码因防御性设计、依赖缺失或运行环境限制未覆盖，均不影响核心功能：

| 位置 | 说明 |
|---|---|
| `backend/main.py:69` | HSTS 头，仅在 HTTPS 请求下触发 |
| `backend/main.py:95-96` | 后台线程异常日志 |
| `backend/schemas.py:146->150` | `expected_return_date` 为 None 的防御分支 |
| `backend/routers/statistics.py:113,204-205` | 空 Top20 与 openpyxl 未安装分支 |
| 前端部分页面 | 极少量 UI 防御分支（如 `disabledDate`）难以通过 jsdom 触发 |

---

## 9. 结论

本项目已完成全量测试覆盖实施：
- 后端测试从 24 条扩展至 **73 条**，语句覆盖率达 **97.4%**，分支覆盖率达 **92.3%**；
- 前端测试从 18 条扩展至 **170 条**，语句覆盖率达 **99.34%**，分支覆盖率达 **91.69%**；
- 所有后端接口 100% 纳入测试；
- 7 条核心业务流程通过端到端测试覆盖；
- CI/CD 与覆盖率校验门禁已接入，可有效防止后续代码覆盖率回落。

整体测试质量已达到项目设定的质量要求。
