# 测试与 CI/CD 说明

本项目包含 **后端（FastAPI + pytest）** 与 **前端（Vite + React + Vitest）** 两套测试体系，并通过 GitHub Actions 自动化执行。

## 目录

- [本地一键运行](#本地一键运行)
- [手动运行测试](#手动运行测试)
  - [后端](#后端)
  - [前端](#前端)
- [覆盖率门禁](#覆盖率门禁)
- [CI/CD 流程](#cicd-流程)

---

## 本地一键运行

### Windows（PowerShell）

```powershell
.\scripts\run-tests.ps1
```

### Linux / macOS（Bash）

```bash
chmod +x scripts/run-tests.sh
./scripts/run-tests.sh
```

脚本会依次完成：

1. 安装/更新后端依赖（自动检测 `.venv` 虚拟环境）。
2. 运行后端 pytest 并生成覆盖率报告。
3. 安装/更新前端依赖（仅在 `node_modules` 不存在时执行 `npm install`）。
4. 运行前端 Vitest 并生成覆盖率报告。
5. 校验所有覆盖率门禁，输出最终 PASS/FAIL 结论。

---

## 手动运行测试

### 后端

```bash
pytest backend/tests/ -v
```

带覆盖率报告：

```bash
pytest --cov=backend --cov-branch \
       --cov-config=backend/.coveragerc \
       --cov-report=term-missing \
       --cov-report=html:backend/coverage_html \
       backend/tests/
```

> `backend/.coveragerc` 中已排除 `backend/tests/` 目录，确保覆盖率指标反映业务代码本身。

### 前端

```bash
cd frontend
npm run test
```

带覆盖率报告：

```bash
cd frontend
npm run test -- --coverage
```

前端覆盖率阈值已在 `frontend/vite.config.js` 的 `test.coverage` 中配置。

---

## 覆盖率门禁

| 项目   | 指标       | 阈值   | 当前基线（约） |
| ------ | ---------- | ------ | -------------- |
| 后端   | statements | ≥ 95%  | 95.9%          |
| 后端   | branches   | ≥ 90%  | 92.2%          |
| 前端   | statements | ≥ 95%  | 99.3%          |
| 前端   | branches   | ≥ 90%  | 91.6%          |
| 前端   | functions  | ≥ 85%  | 90.3%          |

CI 与本地脚本都会强制检查上述阈值，任一指标未达标即判定失败。

---

## CI/CD 流程

GitHub Actions 工作流位于：

```
.github/workflows/ci.yml
```

### 触发条件

- `push` 到 `main` 或 `master` 分支
- 针对 `main` 或 `master` 分支的 `pull_request`

### 任务矩阵

工作流使用矩阵策略并行运行两个任务：

| 任务   | 环境        | 主要步骤                              |
| ------ | ----------- | ------------------------------------- |
| backend  | Python 3.11 | 安装依赖 → pytest → 校验覆盖率        |
| frontend | Node.js 20  | `npm ci` → Vitest → 校验覆盖率        |

### 覆盖率校验

- 后端：读取 `backend/coverage.json`，检查 `statements` 与 `branches`。
- 前端：Vitest 自身会根据 `vite.config.js` 中的 `coverage` 配置中断失败；脚本 additionally 解析 `coverage/coverage-final.json` 输出摘要。

---

## 覆盖率报告位置

- 后端 HTML 报告：`backend/coverage_html/index.html`
- 后端 JSON 报告：`backend/coverage.json`
- 前端 HTML 报告：`frontend/coverage/index.html`
- 前端 JSON 报告：`frontend/coverage/coverage-final.json`
