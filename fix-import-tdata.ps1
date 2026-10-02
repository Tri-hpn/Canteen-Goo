# ============================================================
# FIX IMPORT TDATA — Them tData vao useI18n() trong cac file
# ============================================================

$ErrorActionPreference = "Stop"

$files = @(
    "src\components\FoodDetailModal.jsx",
    "src\components\ChatBotWidget.jsx",
    "src\components\CustomerOrderDetail.jsx",
    "src\components\StaffOrderDetailModal.jsx",
    "src\components\PrintReceipt.jsx",
    "src\pages\customer\CustomerHome.jsx",
    "src\pages\customer\CustomerMenu.jsx",
    "src\pages\customer\CustomerCart.jsx",
    "src\pages\customer\CustomerCheckout.jsx",
    "src\pages\customer\CustomerPromotions.jsx",
    "src\pages\employee\EmployeeMenu.jsx",
    "src\pages\owner\OwnerMenu.jsx"
)

$count = 0
foreach ($f in $files) {
    if (-not (Test-Path $f)) {
        Write-Host "[SKIP] $f" -ForegroundColor Yellow
        continue
    }
    $content = Get-Content $f -Raw -Encoding UTF8

    # Chi thay dong const { t } = useI18n(); thanh const { t, tData } = useI18n();
    $pattern = 'const\s+\{\s*t\s*\}\s*=\s*useI18n\(\)'
    if ($content -match $pattern) {
        $newContent = $content -replace $pattern, 'const { t, tData } = useI18n()'
        Set-Content -Path $f -Value $newContent -Encoding UTF8 -NoNewline
        Write-Host "[OK] $f" -ForegroundColor Green
        $count++
    } else {
        Write-Host "[MISS] $f (khong khop pattern)" -ForegroundColor DarkYellow
    }
}

Write-Host ""
Write-Host "Da sua $count file" -ForegroundColor Cyan
