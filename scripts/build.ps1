<#
.SYNOPSIS
  Typechecks, tests, and builds the RoboApps Server (Node.js & Cloudflare Worker).
.PARAMETER SkipTests
  Skips running the unit/integration test suite during the build.
.EXAMPLE
  .\scripts\build.ps1
  .\scripts\build.ps1 -SkipTests
#>
param (
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"

$rootDir = Join-Path $PSScriptRoot ".."

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Building RoboApps Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Push-Location $rootDir
try {
    if (-not (Test-Path (Join-Path $rootDir "node_modules"))) {
        Write-Host "Installing server dependencies (npm install)..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    }

    Write-Host "`n>>> Step 1/3: Running TypeScript typecheck..." -ForegroundColor Cyan
    npm run typecheck
    if ($LASTEXITCODE -ne 0) { throw "Server typecheck failed" }

    if (-not $SkipTests) {
        Write-Host "`n>>> Step 2/3: Running test suite..." -ForegroundColor Cyan
        npm test
        if ($LASTEXITCODE -ne 0) { throw "Server tests failed" }
    } else {
        Write-Host "`n>>> Step 2/3: Skipping tests..." -ForegroundColor Yellow
    }

    Write-Host "`n>>> Step 3/3: Compiling Node.js bundle (tsc)..." -ForegroundColor Cyan
    npm run build:node
    if ($LASTEXITCODE -ne 0) { throw "Server build failed" }

    Write-Host "`n>>> RoboApps Server build completed successfully." -ForegroundColor Green
} finally {
    Pop-Location
}
