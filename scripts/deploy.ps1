<#
.SYNOPSIS
  Verifies and deploys the RoboApps Server Cloudflare Worker.
.PARAMETER Environment
  The Cloudflare deployment environment ('test' or 'live'). Default: test.
.PARAMETER SkipBuild
  Skips typecheck, tests, and compilation and deploys directly.
.PARAMETER SkipTests
  Runs typecheck and build, but skips tests before deploying.
.EXAMPLE
  .\scripts\deploy.ps1 test
  .\scripts\deploy.ps1 live
  .\scripts\deploy.ps1 test -SkipBuild
#>
param (
    [ValidateSet("test", "live")]
    [string]$Environment = "test",
    [switch]$SkipBuild,
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"

$rootDir = Join-Path $PSScriptRoot ".."

# Step 1: Server verification & build
if (-not $SkipBuild) {
    Write-Host ">>> Step 1/2: Building & Verifying RoboApps Server..." -ForegroundColor Cyan
    if ($SkipTests) {
        & "$PSScriptRoot\build.ps1" -SkipTests
    } else {
        & "$PSScriptRoot\build.ps1"
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Server build failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
} else {
    Write-Host ">>> Step 1/2: Skipping server build..." -ForegroundColor Yellow
}

# Step 2: Cloudflare Worker deployment
Write-Host "`n>>> Step 2/2: Deploying RoboApps Server Worker to Cloudflare ($Environment environment)..." -ForegroundColor Cyan
Push-Location $rootDir
try {
    npx wrangler deploy --env $Environment
} finally {
    Pop-Location
}
