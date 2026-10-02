# ============================================================
# FIX CATEGORY I18N
# ============================================================

# ---------- FIX 1: Backend route /api/categories ----------
Write-Host "=== FIX 1: Backend route ===" -ForegroundColor Cyan

$serverFile = "server-json.js"
$serverContent = Get-Content $serverFile -Raw -Encoding UTF8

# Tim route GET /api/categories (khong phai POST)
$pattern = '(app\.get\("/api/categories",\s*)\(req,\s*res\)\s*=>\s*\{'
if ($serverContent -match $pattern) {
    $serverContent = $serverContent -replace $pattern, 'app.get("/api/categories", async (req, res) => {'
    Write-Host "[OK] Da doi route thanh async" -ForegroundColor Green
} else {
    Write-Host "[WARN] Khong khop pattern route, co the da sua roi" -ForegroundColor Yellow
}

# Kiem tra route co translateList chua
if ($serverContent -match 'api/categories[\s\S]{0,500}translateList') {
    Write-Host "[OK] Route /api/categories da co translateList" -ForegroundColor Green
} else {
    Write-Host "[INFO] Route /api/categories CHUA co translateList - can sua tay" -ForegroundColor Yellow
}

Set-Content -Path $serverFile -Value $serverContent -Encoding UTF8 -NoNewline

# ---------- FIX 2: CustomerMenu.jsx ----------
Write-Host ""
Write-Host "=== FIX 2: CustomerMenu.jsx ===" -ForegroundColor Cyan

$menuFile = "src\pages\customer\CustomerMenu.jsx"
$menuContent = Get-Content $menuFile -Raw -Encoding UTF8

# Doi translateCategory(cat.name, t) -> tData(cat, "name")
$old = 'label: translateCategory(cat.name, t),'
$new = 'label: tData(cat, "name"),'

if ($menuContent.Contains($old)) {
    $menuContent = $menuContent.Replace($old, $new)
    Set-Content -Path $menuFile -Value $menuContent -Encoding UTF8 -NoNewline
    Write-Host "[OK] Da doi label sang tData(cat, `"name`")" -ForegroundColor Green
} else {
    Write-Host "[WARN] Khong tim thay dong: $old" -ForegroundColor Yellow
    # Thu bien the
    if ($menuContent -match 'translateCategory\(cat\.name,\s*t\)') {
        $menuContent = $menuContent -replace 'translateCategory\(cat\.name,\s*t\)', 'tData(cat, "name")'
        Set-Content -Path $menuFile -Value $menuContent -Encoding UTF8 -NoNewline
        Write-Host "[OK] Da doi bang regex" -ForegroundColor Green
    }
}

# Kiem tra tData co trong scope khong
if ($menuContent -match "const\s+\{[^}]*\btData\b[^}]*\}\s*=\s*useI18n\(\)") {
    Write-Host "[OK] tData da co trong scope" -ForegroundColor Green
} else {
    Write-Host "[WARN] tData CHUA co trong scope - can them" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Done." -ForegroundColor Cyan
