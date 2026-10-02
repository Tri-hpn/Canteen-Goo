# ============================================================
# AUTO-THEM useI18n CHO OwnerMenu.jsx (neu chua co)
# ============================================================

$f = "src\pages\owner\OwnerMenu.jsx"

if (-not (Test-Path $f)) {
    Write-Host "[FAIL] $f khong ton tai" -ForegroundColor Red
    exit 1
}

$content = Get-Content $f -Raw -Encoding UTF8

# Check da co useI18n chua
if ($content -match "useI18n\(\)") {
    Write-Host "[SKIP] $f - da co useI18n()" -ForegroundColor Gray
    # Chi kiem tra xem co tData chua
    if ($content -match "const\s+\{[^}]*\btData\b[^}]*\}\s*=\s*useI18n\(\)") {
        Write-Host "[OK] $f - da co tData trong useI18n" -ForegroundColor Green
    } else {
        Write-Host "[WARN] $f - co useI18n nhung chua co tData, can sua tay" -ForegroundColor Yellow
        # Thu them tData
        $content = $content -replace 'const\s+\{\s*t\s*\}\s*=\s*useI18n\(\)', 'const { t, tData } = useI18n()'
        $content = $content -replace 'const\s+\{\s*t\s*,\s*lang\s*\}\s*=\s*useI18n\(\)', 'const { t, tData, lang } = useI18n()'
        Set-Content -Path $f -Value $content -Encoding UTF8 -NoNewline
        Write-Host "[OK] $f - da them tData" -ForegroundColor Green
    }
    exit 0
}

# Chua co useI18n -> them import + hook call
Write-Host "[*] $f chua co useI18n, dang them..." -ForegroundColor Cyan

# 1. Them import (sau dong import cuoi cung tu ../../components hoac ../../api)
$lines = Get-Content $f
$lastImportIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^import\s+.*from\s+['""]\.\..*['""];?\s*$") {
        $lastImportIdx = $i
    }
}

if ($lastImportIdx -lt 0) {
    Write-Host "[FAIL] khong tim thay dong import nao" -ForegroundColor Red
    exit 1
}

$newLines = @()
$newLines += $lines[0..$lastImportIdx]
$newLines += ""
$newLines += "// ✅ i18n hook"
$newLines += "import { useI18n } from `"../../hooks/useI18n`";"
$newLines += $lines[($lastImportIdx + 1)..($lines.Count - 1)]

$content = $newLines -join "`n"

# 2. Chen hook call vao dau function OwnerMenu
$pattern = '(export\s+default\s+function\s+OwnerMenu\s*\([^)]*\)\s*\{)'
if ($content -match $pattern) {
    $content = $content -replace $pattern, "`$1`n  const { t, tData } = useI18n();"
    Write-Host "[OK] Da them hook call vao component" -ForegroundColor Green
} else {
    Write-Host "[WARN] Khong tim thay function OwnerMenu de chen hook" -ForegroundColor Yellow
}

Set-Content -Path $f -Value $content -Encoding UTF8 -NoNewline

Write-Host "[OK] $f da duoc cap nhat" -ForegroundColor Green
