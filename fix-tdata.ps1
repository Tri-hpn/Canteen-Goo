# ============================================================
# FIX TDATA — Chuyen .name -> tData(x, "name") cho menu/category
# ============================================================
# Chi sua cac dong RENDER ten mon / danh muc, khong dung logic.

$ErrorActionPreference = "Stop"
$root = "src"

# Danh sach [file, dong cu, dong moi] chinh xac
$replacements = @(
    # ---- FoodDetailModal.jsx ----
    @{
        file = "$root\components\FoodDetailModal.jsx"
        find = '            {item.name}'
        repl = '            {tData(item, "name")}'
    },
    @{
        file = "$root\components\FoodDetailModal.jsx"
        find = '            {item.description}'
        repl = '            {tData(item, "description")}'
    },
    @{
        file = "$root\components\FoodDetailModal.jsx"
        find = 'aria-label={`${t("Chi tiết")} ${item.name}`}'
        repl = 'aria-label={`${t("Chi tiết")} ${tData(item, "name")}`}'
    },

    # ---- ChatBotWidget.jsx ----
    @{
        file = "$root\components\ChatBotWidget.jsx"
        find = '                    {it.name}'
        repl = '                    {tData(it, "name")}'
    },

    # ---- CustomerOrderDetail.jsx ----
    @{
        file = "$root\components\CustomerOrderDetail.jsx"
        find = '<b>{it.qty}×</b> {it.name}'
        repl = '<b>{it.qty}×</b> {tData(it, "name")}'
    },
    @{
        file = "$root\components\CustomerOrderDetail.jsx"
        find = '{item?.name || t("menu.title")}'
        repl = '{tData(item, "name") || t("menu.title")}'
    },

    # ---- StaffOrderDetailModal.jsx ----
    @{
        file = "$root\components\StaffOrderDetailModal.jsx"
        find = '                      {it.name || "—"}'
        repl = '                      {tData(it, "name") || "—"}'
    },

    # ---- CustomerHome.jsx ----
    @{
        file = "$root\pages\customer\CustomerHome.jsx"
        find = '<h4 className="grab-food-card__name">{m.name}</h4>'
        repl = '<h4 className="grab-food-card__name">{tData(m, "name")}</h4>'
    },

    # ---- CustomerMenu.jsx ----
    @{
        file = "$root\pages\customer\CustomerMenu.jsx"
        find = '<h4 className="grab-food-card__name">{m.name}</h4>'
        repl = '<h4 className="grab-food-card__name">{tData(m, "name")}</h4>'
    },
    @{
        file = "$root\pages\customer\CustomerMenu.jsx"
        find = 'aria-label={t("Thêm {name}").replace("{name}", m.name)}'
        repl = 'aria-label={t("Thêm {name}").replace("{name}", tData(m, "name"))}'
    },

    # ---- CustomerCart.jsx ----
    @{
        file = "$root\pages\customer\CustomerCart.jsx"
        find = '                      {m.name}'
        repl = '                      {tData(m, "name")}'
    },
    @{
        file = "$root\pages\customer\CustomerCart.jsx"
        find = 'aria-label={`${t("Sửa")} ${m.name}`}'
        repl = 'aria-label={`${t("Sửa")} ${tData(m, "name")}`}'
    },
    @{
        file = "$root\pages\customer\CustomerCart.jsx"
        find = 'aria-label={`${t("Xoá")} ${m.name} ${t("khỏi giỏ")}`}'
        repl = 'aria-label={`${t("Xoá")} ${tData(m, "name")} ${t("khỏi giỏ")}`}'
    },

    # ---- CustomerCheckout.jsx ----
    @{
        file = "$root\pages\customer\CustomerCheckout.jsx"
        find = '<b>{m.qty}×</b> {m.name}'
        repl = '<b>{m.qty}×</b> {tData(m, "name")}'
    },

    # ---- CustomerPromotions.jsx ----
    @{
        file = "$root\pages\customer\CustomerPromotions.jsx"
        find = '                    {m.name}'
        repl = '                    {tData(m, "name")}'
    },

    # ---- EmployeeMenu.jsx ----
    @{
        file = "$root\pages\employee\EmployeeMenu.jsx"
        find = '                          {m.name}'
        repl = '                          {tData(m, "name")}'
    },

    # ---- PrintReceipt.jsx ----
    @{
        file = "$root\components\PrintReceipt.jsx"
        find = '                    {it.name || "—"}'
        repl = '                    {tData(it, "name") || "—"}'
    },

    # ---- OwnerMenu.jsx (render) ----
    @{
        file = "$root\pages\owner\OwnerMenu.jsx"
        find = '                    {m.name}'
        repl = '                    {tData(m, "name")}'
    },
    @{
        file = "$root\pages\owner\OwnerMenu.jsx"
        find = '                    {m.description}'
        repl = '                    {tData(m, "description")}'
    }
)

$totalChanged = 0

foreach ($r in $replacements) {
    $filePath = $r.file
    if (-not (Test-Path $filePath)) {
        Write-Host "[SKIP] Khong ton tai: $filePath" -ForegroundColor Yellow
        continue
    }

    $content = Get-Content $filePath -Raw -Encoding UTF8
    $find = $r.find
    $repl = $r.repl

    if ($content.Contains($find)) {
        $newContent = $content.Replace($find, $repl)
        Set-Content -Path $filePath -Value $newContent -Encoding UTF8 -NoNewline
        Write-Host "[OK] $filePath" -ForegroundColor Green
        Write-Host "     - $find" -ForegroundColor DarkGray
        Write-Host "     + $repl" -ForegroundColor DarkGray
        $totalChanged++
    } else {
        Write-Host "[MISS] $filePath" -ForegroundColor DarkYellow
        Write-Host "       Khong tim thay: $find" -ForegroundColor DarkYellow
    }
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  Da sua $totalChanged / $($replacements.Count) cho" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
