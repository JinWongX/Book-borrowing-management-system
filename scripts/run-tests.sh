#!/usr/bin/env bash
# One-click runner for backend and frontend tests with coverage gates.
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)

BACKEND_STMT_THRESHOLD=95.0
BACKEND_BRANCH_THRESHOLD=90.0
FRONTEND_STMT_THRESHOLD=95.0
FRONTEND_BRANCH_THRESHOLD=90.0
FRONTEND_FUNC_THRESHOLD=85.0

BACKEND_OK=true
FRONTEND_OK=true

section() {
  echo ""
  echo "========================================"
  echo " $1"
  echo "========================================"
}

status_line() {
  local ok=$1
  local msg=$2
  if [ "$ok" = true ]; then
    echo "  PASS  $msg"
  else
    echo "  FAIL  $msg"
  fi
}

# ---------- Backend ----------
section "Backend Tests"

if [ -x "$ROOT_DIR/.venv/bin/python" ]; then
  PYTHON="$ROOT_DIR/.venv/bin/python"
  echo "Using venv Python: $PYTHON"
elif [ -x "$ROOT_DIR/.venv/Scripts/python.exe" ]; then
  PYTHON="$ROOT_DIR/.venv/Scripts/python.exe"
  echo "Using venv Python: $PYTHON"
else
  PYTHON=$(command -v python3 || command -v python)
  echo "Using system Python: $PYTHON"
fi

echo "Installing backend dependencies..."
"$PYTHON" -m pip install -r "$ROOT_DIR/backend/requirements.txt" pytest pytest-cov coverage

COV_JSON="$ROOT_DIR/backend/coverage.json"
rm -f "$COV_JSON"

echo "Running backend tests..."
if ! "$PYTHON" -m pytest \
       --cov=backend \
       --cov-branch \
       --cov-config="$ROOT_DIR/backend/.coveragerc" \
       --cov-report=term-missing \
       --cov-report="json:$COV_JSON" \
       "$ROOT_DIR/backend/tests"; then
  BACKEND_OK=false
fi

if [ -f "$COV_JSON" ]; then
  read -r STMT_VALUE BRANCH_VALUE <<EOF
$("$PYTHON" - <<PY
import json
with open(r'$COV_JSON', encoding='utf-8') as f:
    data = json.load(f)
totals = data['totals']
print(f"{totals['percent_statements_covered']:.4f} {totals['percent_branches_covered']:.4f}")
PY
)
EOF

  STMT_OK=$(awk "BEGIN { print ($STMT_VALUE >= $BACKEND_STMT_THRESHOLD) ? \"true\" : \"false\" }")
  BRANCH_OK=$(awk "BEGIN { print ($BRANCH_VALUE >= $BACKEND_BRANCH_THRESHOLD) ? \"true\" : \"false\" }")

  echo ""
  echo "Backend coverage summary:"
  status_line "$STMT_OK" "statements ${STMT_VALUE}% (need >= ${BACKEND_STMT_THRESHOLD}%)"
  status_line "$BRANCH_OK" "branches   ${BRANCH_VALUE}% (need >= ${BACKEND_BRANCH_THRESHOLD}%)"

  if [ "$STMT_OK" != true ] || [ "$BRANCH_OK" != true ]; then
    BACKEND_OK=false
  fi
else
  echo "Backend coverage report missing."
  BACKEND_OK=false
fi

# ---------- Frontend ----------
section "Frontend Tests"

FRONTEND_DIR="$ROOT_DIR/frontend"
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
else
  echo "node_modules exists, skipping npm install."
fi

echo "Running frontend tests..."
if ! npm run test -- --coverage; then
  FRONTEND_OK=false
fi

if [ -f "coverage/coverage-final.json" ]; then
  read -r STMT_VALUE BRANCH_VALUE FUNC_VALUE <<EOF
$(node - <<'JS'
const data = require('./coverage/coverage-final.json');
const totals = { st: { t: 0, c: 0 }, br: { t: 0, c: 0 }, fn: { t: 0, c: 0 } };
for (const file of Object.values(data)) {
  const sk = Object.keys(file.s);
  totals.st.t += sk.length;
  totals.st.c += sk.filter(k => file.s[k] > 0).length;
  for (const arr of Object.values(file.b || {})) {
    totals.br.t += arr.length;
    totals.br.c += arr.filter(v => v > 0).length;
  }
  for (const v of Object.values(file.f || {})) {
    totals.fn.t += 1;
    if (v > 0) totals.fn.c += 1;
  }
}
const pct = (c, t) => t ? (c / t * 100).toFixed(4) : '0.0000';
console.log(`${pct(totals.st.c, totals.st.t)} ${pct(totals.br.c, totals.br.t)} ${pct(totals.fn.c, totals.fn.t)}`);
JS
)
EOF

  STMT_OK=$(awk "BEGIN { print ($STMT_VALUE >= $FRONTEND_STMT_THRESHOLD) ? \"true\" : \"false\" }")
  BRANCH_OK=$(awk "BEGIN { print ($BRANCH_VALUE >= $FRONTEND_BRANCH_THRESHOLD) ? \"true\" : \"false\" }")
  FUNC_OK=$(awk "BEGIN { print ($FUNC_VALUE >= $FRONTEND_FUNC_THRESHOLD) ? \"true\" : \"false\" }")

  echo ""
  echo "Frontend coverage summary:"
  status_line "$STMT_OK" "statements ${STMT_VALUE}% (need >= ${FRONTEND_STMT_THRESHOLD}%)"
  status_line "$BRANCH_OK" "branches   ${BRANCH_VALUE}% (need >= ${FRONTEND_BRANCH_THRESHOLD}%)"
  status_line "$FUNC_OK" "functions  ${FUNC_VALUE}% (need >= ${FRONTEND_FUNC_THRESHOLD}%)"

  if [ "$STMT_OK" != true ] || [ "$BRANCH_OK" != true ] || [ "$FUNC_OK" != true ]; then
    FRONTEND_OK=false
  fi
else
  echo "Frontend coverage report missing."
  FRONTEND_OK=false
fi

# ---------- Final summary ----------
section "Final Result"
status_line "$BACKEND_OK" "Backend"
status_line "$FRONTEND_OK" "Frontend"

if [ "$BACKEND_OK" = true ] && [ "$FRONTEND_OK" = true ]; then
  echo ""
  echo "All tests and coverage gates passed."
  exit 0
else
  echo ""
  echo "Some tests or coverage gates failed. See logs above."
  exit 1
fi
