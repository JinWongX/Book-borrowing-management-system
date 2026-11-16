#requires -Version 5.1
<#
.SYNOPSIS
    One-click runner for backend and frontend tests with coverage gates.
.DESCRIPTION
    1. Installs dependencies (auto-detects .venv or system Python).
    2. Runs backend pytest + coverage, checks statements >= 95% and branches >= 90%.
    3. Runs frontend Vitest + coverage, checks statements >= 95%, branches >= 90%, functions >= 85%.
    4. Prints a final PASS/FAIL summary.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$results = @{ Backend = $true; Frontend = $true }

$backendStmtThreshold = 95.0
$backendBranchThreshold = 90.0
$frontendStmtThreshold = 95.0
$frontendBranchThreshold = 90.0
$frontendFuncThreshold = 85.0

function Write-Section {
    param([string]$Title)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " $Title" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Status {
    param([bool]$Ok, [string]$Message)
    if ($Ok) {
        Write-Host "  PASS  $Message" -ForegroundColor Green
    }
    else {
        Write-Host "  FAIL  $Message" -ForegroundColor Red
    }
}

# ---------- Backend ----------
Write-Section "Backend Tests"

$python = "python"
$venvPython = Join-Path $root ".venv\Scripts\python.exe"
if (Test-Path $venvPython) {
    $python = $venvPython
    Write-Host "Using venv Python: $python" -ForegroundColor DarkGray
}
else {
    Write-Host "Using system Python: $python" -ForegroundColor DarkGray
}

Write-Host "Installing backend dependencies..." -ForegroundColor DarkGray
& $python -m pip install -r (Join-Path $root "backend\requirements.txt") pytest pytest-cov coverage | Out-String | Write-Host

$covJson = Join-Path $root "backend\coverage.json"
if (Test-Path $covJson) { Remove-Item $covJson -Force }

$pytestArgs = @(
    "--cov=backend",
    "--cov-branch",
    "--cov-config=$(Join-Path $root "backend\.coveragerc")",
    "--cov-report=term-missing",
    "--cov-report=json:$covJson",
    (Join-Path $root "backend\tests")
)

Write-Host "Running backend tests..." -ForegroundColor DarkGray
& $python -m pytest @pytestArgs
if ($LASTEXITCODE -ne 0) {
    $results.Backend = $false
}

if (Test-Path $covJson) {
    $checkBackend = @"
import json, sys
with open(r'$covJson', encoding='utf-8') as f:
    data = json.load(f)
totals = data['totals']
stmt = totals['percent_statements_covered']
branch = totals['percent_branches_covered']
print(f'{stmt:.4f}')
print(f'{branch:.4f}')
"@
    $raw = & $python -c $checkBackend
    $values = ($raw -split '\s+') | Select-Object -First 2
    $stmtValue = [double]$values[0]
    $branchValue = [double]$values[1]

    Write-Host "`nBackend coverage summary:"
    Write-Status -Ok ($stmtValue -ge $backendStmtThreshold) -Message "statements  ${stmtValue:F2}% (need >= ${backendStmtThreshold}%)"
    Write-Status -Ok ($branchValue -ge $backendBranchThreshold) -Message "branches    ${branchValue:F2}% (need >= ${backendBranchThreshold}%)"

    if ($stmtValue -lt $backendStmtThreshold -or $branchValue -lt $backendBranchThreshold) {
        $results.Backend = $false
    }
}
else {
    Write-Host "Backend coverage report missing." -ForegroundColor Red
    $results.Backend = $false
}

# ---------- Frontend ----------
Write-Section "Frontend Tests"

$frontendDir = Join-Path $root "frontend"
Push-Location $frontendDir

try {
    if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor DarkGray
        npm install
    }
    else {
        Write-Host "node_modules exists, skipping npm install." -ForegroundColor DarkGray
    }

    Write-Host "Running frontend tests..." -ForegroundColor DarkGray
    npm run test -- --coverage
    if ($LASTEXITCODE -ne 0) {
        $results.Frontend = $false
    }

    $covFinal = Join-Path $frontendDir "coverage\coverage-final.json"
    if (Test-Path $covFinal) {
        $checkFrontend = @"
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
console.log(pct(totals.st.c, totals.st.t));
console.log(pct(totals.br.c, totals.br.t));
console.log(pct(totals.fn.c, totals.fn.t));
"@
        $raw = node -e $checkFrontend
        $values = ($raw -split '\s+') | Select-Object -First 3
        $stmtValue = [double]$values[0]
        $branchValue = [double]$values[1]
        $funcValue = [double]$values[2]

        Write-Host "`nFrontend coverage summary:"
        Write-Status -Ok ($stmtValue -ge $frontendStmtThreshold) -Message "statements ${stmtValue:F2}% (need >= ${frontendStmtThreshold}%)"
        Write-Status -Ok ($branchValue -ge $frontendBranchThreshold) -Message "branches   ${branchValue:F2}% (need >= ${frontendBranchThreshold}%)"
        Write-Status -Ok ($funcValue -ge $frontendFuncThreshold) -Message "functions  ${funcValue:F2}% (need >= ${frontendFuncThreshold}%)"

        $frontendCoverageOk = ($stmtValue -ge $frontendStmtThreshold) -and
                              ($branchValue -ge $frontendBranchThreshold) -and
                              ($funcValue -ge $frontendFuncThreshold)
        if (-not $frontendCoverageOk) {
            $results.Frontend = $false
        }
    }
    else {
        Write-Host "Frontend coverage report missing." -ForegroundColor Red
        $results.Frontend = $false
    }
}
finally {
    Pop-Location
}

# ---------- Final summary ----------
Write-Section "Final Result"
Write-Status -Ok $results.Backend -Message "Backend"
Write-Status -Ok $results.Frontend -Message "Frontend"

if ($results.Backend -and $results.Frontend) {
    Write-Host "`nAll tests and coverage gates passed." -ForegroundColor Green
    exit 0
}
else {
    Write-Host "`nSome tests or coverage gates failed. See logs above." -ForegroundColor Red
    exit 1
}
