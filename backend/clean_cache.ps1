<#
.SYNOPSIS
    Cleans stale Python cache files and verifies DocuFlow backend structure.
    Compatible with Windows + PyCharm.
#>

param(
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\clean_cache.ps1" -ForegroundColor Cyan
    Write-Host "  Run from the 'backend' folder of your DocuFlow project." -ForegroundColor White
    exit
}

Write-Host ""
Write-Host "=== DocuFlow Cache Cleaner & Structure Verifier ===" -ForegroundColor Cyan
Write-Host ""

# --- Check we are in the right directory ---
$expectedMarker = "app\main.py"
if (-not (Test-Path $expectedMarker)) {
    Write-Host "❌ ERROR: This script must be run from the 'backend' folder." -ForegroundColor Red
    Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "   Expected to find: $expectedMarker" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "👉 Navigate to the correct folder and try again:" -ForegroundColor Cyan
    Write-Host "   cd C:\Users\NOMAD\PycharmProjects\APSdocs1\backend" -ForegroundColor White
    exit 1
}

# --- Step 1: Delete __pycache__ folders ---
Write-Host "[1/4] Deleting stale __pycache__ folders..." -ForegroundColor Yellow
$pycacheCount = 0
Get-ChildItem -Path "." -Recurse -Directory -Filter "__pycache__" | ForEach-Object {
    try {
        Remove-Item $_.FullName -Recurse -Force -ErrorAction Stop
        $pycacheCount++
        Write-Host "  Removed: $($_.FullName)" -ForegroundColor DarkGray
    } catch {
        Write-Host "  ⚠ Could not delete $($_.FullName): $_" -ForegroundColor DarkYellow
    }
}
Write-Host "  Removed $pycacheCount __pycache__ folder(s)" -ForegroundColor Green

# --- Step 2: Delete stray .pyc files ---
Write-Host "[2/4] Deleting stray .pyc files..." -ForegroundColor Yellow
$pycFiles = Get-ChildItem -Path "." -Recurse -Filter "*.pyc" -File
$pycCount = 0
foreach ($file in $pycFiles) {
    try {
        Remove-Item $file.FullName -Force -ErrorAction Stop
        $pycCount++
    } catch {
        Write-Host "  ⚠ Could not delete $($file.FullName): $_" -ForegroundColor DarkYellow
    }
}
Write-Host "  Removed $pycCount .pyc file(s)" -ForegroundColor Green

# --- Step 3: Verify essential files ---
Write-Host "[3/4] Verifying required files..." -ForegroundColor Yellow
$required = @(
    "app\main.py",
    "app\config.py",
    "app\database.py",
    "app\models\models.py",
    "app\api\auth.py",
    "app\api\convert.py",
    "app\api\ai.py",
    "app\api\payment.py",
    "app\services\conversion.py",
    "app\services\ai_service.py",
    "app\services\watermark.py",
    "app\services\storage.py",
    "app\services\paystack.py",
    "app\utils\auth.py",
    "app\utils\rate_limit.py",
    "app\tasks\celery_tasks.py"
)

$missing = @()
foreach ($f in $required) {
    if (Test-Path $f) {
        Write-Host "  [OK] $f" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $f" -ForegroundColor Red
        $missing += $f
    }
}

# --- Step 4: Check .env file ---
Write-Host "[4/4] Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "  [OK] .env file found" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] .env file not found" -ForegroundColor Yellow
    Write-Host "           Copy .env.example to .env and fill in your keys." -ForegroundColor DarkYellow
}

# --- Summary ---
Write-Host ""
if ($missing.Count -eq 0) {
    Write-Host "✅ All required files are present." -ForegroundColor Green
} else {
    Write-Host "❌ Some files are missing ($($missing.Count) total):" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "👉 Paste the missing files back or re-run the project creation script." -ForegroundColor Cyan
}

# --- Virtual environment check ---
Write-Host ""
if ($env:VIRTUAL_ENV) {
    Write-Host "✅ Virtual environment active: $env:VIRTUAL_ENV" -ForegroundColor Green
} else {
    Write-Host "⚠ No virtual environment detected." -ForegroundColor Yellow
    Write-Host "   Activate it with: .\.venv3\Scripts\Activate.ps1" -ForegroundColor Cyan
}

# --- PyCharm advice ---
Write-Host ""
Write-Host "--- PyCharm Tips ---" -ForegroundColor Cyan
Write-Host "If you still see unresolved references in the editor:" -ForegroundColor White
Write-Host "   1. File → Invalidate Caches / Restart..." -ForegroundColor White
Write-Host "   2. Select 'Invalidate and Restart'." -ForegroundColor White
Write-Host "   3. After restart, let indexing finish." -ForegroundColor White
Write-Host ""

if ($missing.Count -eq 0) {
    Write-Host "=== Ready to start the server ===" -ForegroundColor Green
    Write-Host "Run: uvicorn app.main:app --reload --port 8000" -ForegroundColor White
}