# ============================================================
# test-fixes.ps1 — Verify 4 bug fix backend (Windows PowerShell)
#   H1: Hủy đơn → hoàn kho + hoàn điểm
#   H2: Ví thiếu → KHÔNG trừ kho
#   H3: Món inactive → không đặt được
#   H4: qty <= 0 → không đặt được
# ============================================================
param([string]$Api = "http://localhost:3000")

$script:Pass = 0
$script:Fail = 0

function Pass($msg) { Write-Host "✓ PASS " -ForegroundColor Green -NoNewline; Write-Host $msg; $script:Pass++ }
function Fail($msg) { Write-Host "✗ FAIL " -ForegroundColor Red   -NoNewline; Write-Host $msg; $script:Fail++ }
function Info($msg) { Write-Host "ℹ "     -ForegroundColor Yellow -NoNewline; Write-Host $msg }
function Title($msg){ Write-Host ""; Write-Host "=== $msg ===" -ForegroundColor Cyan }

# ---------- HTTP helper ----------
function Call-Api {
    param([string]$Method, [string]$Path, [string]$Token = "", [string]$Body = "")
    $headers = @{}
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    $uri = "$Api$Path"

    try {
        if ($Body) {
            $resp = Invoke-WebRequest -Uri $uri -Method $Method -Headers $headers `
                    -ContentType "application/json" -Body $Body -UseBasicParsing
        } else {
            $resp = Invoke-WebRequest -Uri $uri -Method $Method -Headers $headers -UseBasicParsing
        }
        return @{ Status = [int]$resp.StatusCode; Body = $resp.Content }
    } catch {
        $status = 0
        $body = ""
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $body = $reader.ReadToEnd()
            } catch {}
        }
        return @{ Status = $status; Body = $body }
    }
}

function Parse-Json($str) {
    if (-not $str) { return $null }
    try { return $str | ConvertFrom-Json } catch { return $null }
}

# ---------- Setup ----------
Title "SETUP"
Info "API: $Api"

# Retry login (Render cold start có thể ~30s)
$adminToken = $null
$customerToken = $null
for ($i = 1; $i -le 3; $i++) {
    $r1 = Call-Api -Method POST -Path "/api/auth/login" -Body '{"email":"admin@vwa.vn","password":"123456"}'
    $adminToken = (Parse-Json $r1.Body).token
    if ($adminToken) { break }
    Info "Thử login lần $i thất bại (status=$($r1.Status)). Chờ 5s..."
    Start-Sleep -Seconds 5
}

if (-not $adminToken) {
    Write-Host "Không login được admin. Kiểm tra server + seed data." -ForegroundColor Red
    exit 1
}

$r2 = Call-Api -Method POST -Path "/api/auth/login" -Body '{"email":"sinhvien@vwa.vn","password":"123456"}'
$customerToken = (Parse-Json $r2.Body).token
if (-not $customerToken) {
    Write-Host "Không login được customer." -ForegroundColor Red
    exit 1
}
Info "Login admin + customer: OK"

# Tạo item test
$itemName = "ZZ_Test_$(Get-Date -UFormat %s)"
$createBody = "{`"name`":`"$itemName`",`"category`":`"Cơm`",`"price`":10000,`"stock`":10,`"active`":1}"
$createResp = Call-Api -Method POST -Path "/api/menu" -Token $adminToken -Body $createBody
$itemObj = Parse-Json $createResp.Body
$itemId = $itemObj.id

if (-not $itemId) {
    Write-Host "Tạo item test thất bại: $($createResp.Body)" -ForegroundColor Red
    exit 1
}
Info "Item test: id=$itemId name=$itemName"

# Helper đọc stock hiện tại
function Get-ItemStock {
    $r = Call-Api -Method GET -Path "/api/menu?all=1" -Token $adminToken
    $list = Parse-Json $r.Body
    $m = $list | Where-Object { [string]$_.id -eq [string]$itemId } | Select-Object -First 1
    if ($m) { return [int]$m.stock } else { return -1 }
}
function Get-CustomerPoints {
    $r = Call-Api -Method GET -Path "/api/auth/me" -Token $customerToken
    $u = Parse-Json $r.Body
    if ($u) { return [int]$u.points } else { return -1 }
}

# ---------- H4 ----------
Title "H4 — qty <= 0"

$r = Call-Api -Method POST -Path "/api/orders" -Token $customerToken `
     -Body "{`"items`":[{`"menuItem`":$itemId,`"qty`":0}],`"payment`":`"Tiền mặt`"}"
if ($r.Status -eq 400) { Pass "H4a qty=0 → 400" } else { Fail "H4a qty=0 → $($r.Status) (mong đợi 400)" }

$r = Call-Api -Method POST -Path "/api/orders" -Token $customerToken `
     -Body "{`"items`":[{`"menuItem`":$itemId,`"qty`":-1}],`"payment`":`"Tiền mặt`"}"
if ($r.Status -eq 400) { Pass "H4b qty=-1 → 400" } else { Fail "H4b qty=-1 → $($r.Status) (mong đợi 400)" }

$r = Call-Api -Method POST -Path "/api/orders" -Token $customerToken `
     -Body "{`"items`":[{`"menuItem`":$itemId,`"qty`":1.5}],`"payment`":`"Tiền mặt`"}"
if ($r.Status -eq 400) { Pass "H4c qty=1.5 → 400" } else { Fail "H4c qty=1.5 → $($r.Status) (mong đợi 400)" }

# ---------- H3 ----------
Title "H3 — Đặt món đã tắt"

Call-Api -Method PUT -Path "/api/menu/$itemId" -Token $adminToken -Body '{"active":0}' | Out-Null

$r = Call-Api -Method POST -Path "/api/orders" -Token $customerToken `
     -Body "{`"items`":[{`"menuItem`":$itemId,`"qty`":1}],`"payment`":`"Tiền mặt`"}"
if ($r.Status -eq 400) {
    $j = Parse-Json $r.Body
    Pass "H3 món inactive → 400 (msg: '$($j.message)')"
} else {
    Fail "H3 món inactive → $($r.Status) (mong đợi 400)"
}

Call-Api -Method PUT -Path "/api/menu/$itemId" -Token $adminToken -Body '{"active":1}' | Out-Null

# ---------- H2 ----------
Title "H2 — Ví thiếu tiền"

Call-Api -Method PUT -Path "/api/menu/$itemId" -Token $adminToken `
  -Body '{"price":500000000,"stock":10,"active":1}' | Out-Null

$stockBefore = Get-ItemStock
$r = Call-Api -Method POST -Path "/api/orders" -Token $customerToken `
     -Body "{`"items`":[{`"menuItem`":$itemId,`"qty`":1}],`"payment`":`"Ví Canteen`"}"
$stockAfter = Get-ItemStock

if ($r.Status -eq 400 -and $stockBefore -eq $stockAfter) {
    Pass "H2 ví thiếu → 400 + stock KHÔNG đổi ($stockBefore → $stockAfter)"
} else {
    Fail "H2 ví thiếu → status=$($r.Status), stock $stockBefore → $stockAfter"
}

# ---------- H1 ----------
Title "H1 — Hủy đơn hoàn kho + điểm"

Call-Api -Method PUT -Path "/api/menu/$itemId" -Token $adminToken `
  -Body '{"price":10000,"stock":10,"active":1}' | Out-Null

$pointsBefore = Get-CustomerPoints
$stockBefore1 = Get-ItemStock
Info "Trước đặt hàng: stock=$stockBefore1 points=$pointsBefore"

$r = Call-Api -Method POST -Path "/api/orders" -Token $customerToken `
     -Body "{`"items`":[{`"menuItem`":$itemId,`"qty`":3}],`"payment`":`"Tiền mặt`"}"
$orderObj = Parse-Json $r.Body
$orderId = $orderObj.id

if ($r.Status -ne 201 -or -not $orderId) {
    Fail "H1 setup: tạo order thất bại status=$($r.Status) body=$($r.Body)"
} else {
    Pass "H1 setup: tạo order qty=3 OK (id=$orderId)"

    $stockMid = Get-ItemStock
    $pointsMid = Get-CustomerPoints
    Info "Sau đặt hàng: stock=$stockMid points=$pointsMid"

    if ($stockMid -eq 7) { Pass "H1a stock giảm đúng (10 → 7)" }
    else { Fail "H1a stock=$stockMid, mong đợi 7" }

    if ($pointsMid -gt $pointsBefore) { Pass "H1b điểm tăng ($pointsBefore → $pointsMid)" }
    else { Fail "H1b điểm không tăng ($pointsBefore → $pointsMid)" }

    $r2 = Call-Api -Method PATCH -Path "/api/orders/$orderId" -Token $adminToken -Body '{"status":"Đã hủy"}'
    if ($r2.Status -eq 200) { Pass "H1c admin hủy đơn → 200" }
    else { Fail "H1c admin hủy đơn → $($r2.Status)" }

    $stockAfter1 = Get-ItemStock
    $pointsAfter1 = Get-CustomerPoints
    Info "Sau hủy: stock=$stockAfter1 points=$pointsAfter1"

    if ($stockAfter1 -eq 10) { Pass "H1d hoàn stock (7 → 10)" }
    else { Fail "H1d stock sau hủy=$stockAfter1, mong đợi 10" }

    if ($pointsAfter1 -eq $pointsBefore) { Pass "H1e hoàn điểm về ban đầu ($pointsAfter1)" }
    else { Fail "H1e điểm=$pointsAfter1, mong đợi $pointsBefore" }
}

# ---------- H1-extra: customer tự hủy ----------
Title "H1-extra — Customer tự hủy"

$pointsBefore2 = Get-CustomerPoints
$stockBefore2 = Get-ItemStock

$r = Call-Api -Method POST -Path "/api/orders" -Token $customerToken `
     -Body "{`"items`":[{`"menuItem`":$itemId,`"qty`":2}],`"payment`":`"Tiền mặt`"}"
$orderObj2 = Parse-Json $r.Body
$orderId2 = $orderObj2.id

if ($r.Status -ne 201 -or -not $orderId2) {
    Fail "H1-extra setup: tạo order thất bại status=$($r.Status)"
} else {
    $stockMid2 = Get-ItemStock

    $r2 = Call-Api -Method POST -Path "/api/orders/$orderId2/cancel" -Token $customerToken
    if ($r2.Status -eq 200) { Pass "H1-extra customer cancel → 200" }
    else { Fail "H1-extra customer cancel → $($r2.Status)" }

    $stockAfter2 = Get-ItemStock
    $pointsAfter2 = Get-CustomerPoints

    if ($stockAfter2 -eq $stockBefore2) { Pass "H1-extra hoàn stock ($stockMid2 → $stockAfter2)" }
    else { Fail "H1-extra stock=$stockAfter2, mong đợi $stockBefore2" }

    if ($pointsAfter2 -eq $pointsBefore2) { Pass "H1-extra hoàn điểm ($pointsAfter2)" }
    else { Fail "H1-extra điểm=$pointsAfter2, mong đợi $pointsBefore2" }
}

# ---------- Cleanup ----------
Info "Cleanup: xóa item test id=$itemId"
Call-Api -Method DELETE -Path "/api/menu/$itemId" -Token $adminToken | Out-Null

# ---------- Summary ----------
Title "KẾT QUẢ"
Write-Host "  PASS: $($script:Pass)" -ForegroundColor Green
Write-Host "  FAIL: $($script:Fail)" -ForegroundColor Red
Write-Host ""

if ($script:Fail -eq 0) {
    Write-Host "🎉 Tất cả test PASS — 4 bug đã fix hoạt động đúng." -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️  Có $($script:Fail) test FAIL — kiểm tra lại backend." -ForegroundColor Red
    exit 1
}