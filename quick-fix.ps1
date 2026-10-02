# ============================================================
# quick-fix.ps1 — Fix nhanh toàn bộ lỗi Canteen VWA (v2)
# Chạy: powershell -ExecutionPolicy Bypass -File quick-fix.ps1
# ============================================================

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

function Log($msg)  { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "   [OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "   [!]  $msg" -ForegroundColor Yellow }
function Err($msg)  { Write-Host "   [X]  $msg" -ForegroundColor Red }
function Step($msg) { Write-Host ""; Write-Host "=== $msg ===" -ForegroundColor Magenta }

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "       CANTEEN VWA - QUICK FIX v2 (Windows PowerShell)     " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# ============================================================
# STEP 0: Backup
# ============================================================
Step "STEP 0: Backup"

New-Item -ItemType Directory -Force -Path ".backup-quickfix" | Out-Null

$filesToBackup = @(
    "api.js",
    "autoTranslate.js",
    "server-json.js",
    "src\hooks\useCrossTabSync.js",
    "src\App.jsx",
    "src\pages\owner\OwnerMenu.jsx",
    "src\pages\owner\OwnerPriceHistory.jsx",
    "src\pages\employee\EmployeeMenu.jsx",
    "src\pages\customer\CustomerMenu.jsx",
    "src\pages\customer\CustomerHome.jsx",
    "src\pages\customer\CustomerChat.jsx",
    "src\components\ChatBotWidget.jsx",
    "src\components\GlobalSearch.jsx",
    "src\lib\i18n\locales\_source.json"
)

foreach ($f in $filesToBackup) {
    if (Test-Path $f) {
        $flat = $f -replace '[\\/]', '_'
        $dest = ".backup-quickfix/$flat.$stamp.bak"
        Copy-Item $f $dest -Force
    }
}
Ok "Backup xong -> .backup-quickfix/"

# ============================================================
# STEP 1: Fix api.js — tách list / listActive
# ============================================================
Step "STEP 1: Fix api.js"

if (-not (Test-Path "api.js")) {
    Err "Không tìm thấy api.js"
} else {
    $content = Get-Content "api.js" -Raw -Encoding UTF8
    $oldMenuRegex = '(?s)menu:\s*\{.*?remove:\s*\(id\)\s*=>\s*req\(`/menu/\$\{id\}`,\s*\{\s*method:\s*"DELETE"\s*\}\)\s*,?\s*\}'

    $newMenu = @'
menu: {
    // Admin/Employee: lấy TẤT CẢ món (kể cả active=0)
    list: (q = "", category = "Tất cả", sort = "popular") => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category && category !== "Tất cả") params.set("category", category);
      if (sort) params.set("sort", sort);
      const qs = params.toString();
      return req("/menu" + (qs ? "?" + qs : ""));
    },

    // Customer: CHỈ lấy món active=1
    listActive: (q = "", category = "Tất cả", sort = "popular") => {
      const params = new URLSearchParams();
      params.set("active_only", "1");
      if (q) params.set("q", q);
      if (category && category !== "Tất cả") params.set("category", category);
      if (sort) params.set("sort", sort);
      return req("/menu?" + params.toString());
    },

    get:    (id)          => req(`/menu/${id}`),
    create: (data)        => req("/menu",       { method: "POST",   body: JSON.stringify(data) }),
    update: (id, data)    => req(`/menu/${id}`, { method: "PUT",    body: JSON.stringify(data) }),
    remove: (id)          => req(`/menu/${id}`, { method: "DELETE" }),
  }
'@

    if ($content -match $oldMenuRegex) {
        $newContent = $content -replace $oldMenuRegex, $newMenu
        Set-Content "api.js" $newContent -Encoding UTF8 -NoNewline
        Ok "api.js - đã cập nhật menu.list / menu.listActive"
    } else {
        Warn "api.js - không match regex, bỏ qua"
    }
}

# ============================================================
# STEP 2: Fix calls — dùng listActive cho Customer
# ============================================================
Step "STEP 2: Fix calls trong Customer/Employee/Owner pages"

function Replace-InFile {
    param([string]$File, [string]$Pattern, [string]$Replacement, [string]$Label)
    if (-not (Test-Path $File)) {
        Warn "$File - không tồn tại, skip"
        return
    }
    $c = Get-Content $File -Raw -Encoding UTF8
    if ($c -match $Pattern) {
        $c = $c -replace $Pattern, $Replacement
        Set-Content $File $c -Encoding UTF8 -NoNewline
        Ok "$Label"
    } else {
        Warn "$File - không match, skip"
    }
}

Replace-InFile `
    -File "src\pages\customer\CustomerMenu.jsx" `
    -Pattern 'api\.menu\.list\("",\s*ALL_CATEGORY,\s*"popular"\)' `
    -Replacement 'api.menu.listActive("", ALL_CATEGORY, "popular")' `
    -Label "CustomerMenu.jsx -> listActive"

Replace-InFile `
    -File "src\pages\customer\CustomerHome.jsx" `
    -Pattern 'api\.menu\.list\("",\s*"Tất cả",\s*"popular"\)' `
    -Replacement 'api.menu.listActive("", "Tất cả", "popular")' `
    -Label "CustomerHome.jsx -> listActive"

Replace-InFile `
    -File "src\pages\customer\CustomerChat.jsx" `
    -Pattern 'api\.menu\s*\.list\("",\s*"Tất cả",\s*"popular"\)' `
    -Replacement 'api.menu.listActive("", "Tất cả", "popular")' `
    -Label "CustomerChat.jsx -> listActive"

Replace-InFile `
    -File "src\components\ChatBotWidget.jsx" `
    -Pattern 'api\.menu\s*\.list\("",\s*"Tất cả",\s*"popular"\)' `
    -Replacement 'api.menu.listActive("", "Tất cả", "popular")' `
    -Label "ChatBotWidget.jsx -> listActive"

Replace-InFile `
    -File "src\pages\owner\OwnerMenu.jsx" `
    -Pattern 'api\.menu\.list\("",\s*"Tất cả",\s*"popular",\s*true\)' `
    -Replacement 'api.menu.list("", "Tất cả", "popular")' `
    -Label "OwnerMenu.jsx -> bỏ all=true"

Replace-InFile `
    -File "src\pages\owner\OwnerPriceHistory.jsx" `
    -Pattern 'api\.menu\s*\.list\("",\s*"Tất cả",\s*"popular",\s*true\)' `
    -Replacement 'api.menu.list("", "Tất cả", "popular")' `
    -Label "OwnerPriceHistory.jsx -> bỏ all=true"

Replace-InFile `
    -File "src\pages\employee\EmployeeMenu.jsx" `
    -Pattern 'api\.menu\.list\("",\s*"Tất cả",\s*"popular",\s*true\)' `
    -Replacement 'api.menu.list("", "Tất cả", "popular")' `
    -Label "EmployeeMenu.jsx -> bỏ all=true"

# GlobalSearch.jsx — role-aware
if (Test-Path "src\components\GlobalSearch.jsx") {
    $c = Get-Content "src\components\GlobalSearch.jsx" -Raw -Encoding UTF8
    $oldGs = 'const menu = await api\.menu\.list\(trimmed,\s*"Tất cả",\s*"popular"\);'
    $newGs = @'
const menu = role === "CUSTOMER"
          ? await api.menu.listActive(trimmed, "Tất cả", "popular")
          : await api.menu.list(trimmed, "Tất cả", "popular");
'@
    if ($c -match $oldGs) {
        $c = $c -replace $oldGs, $newGs
        Set-Content "src\components\GlobalSearch.jsx" $c -Encoding UTF8 -NoNewline
        Ok "GlobalSearch.jsx -> role-aware"
    } else {
        Warn "GlobalSearch.jsx - không match, skip"
    }
}

# ============================================================
# STEP 3: Fix OwnerMenu.jsx — tắt debug banner
# ============================================================
Step "STEP 3: Fix OwnerMenu.jsx - tắt debug banner"

Replace-InFile `
    -File "src\pages\owner\OwnerMenu.jsx" `
    -Pattern 'const DEBUG = true;' `
    -Replacement 'const DEBUG = import.meta.env.DEV;' `
    -Label "OwnerMenu.jsx -> DEBUG = import.meta.env.DEV"

# ============================================================
# STEP 4: Fix App.jsx — dispatch event "logout"
# ============================================================
Step "STEP 4: Fix App.jsx - dispatch event logout"

if (Test-Path "src\App.jsx") {
    $c = Get-Content "src\App.jsx" -Raw -Encoding UTF8

    $oldLogout = @'
    document.body.classList.remove("has-bottom-nav");
    document.body.classList.remove("mobile-open");

    navigate("/");
  };
'@

    $newLogout = @'
    document.body.classList.remove("has-bottom-nav");
    document.body.classList.remove("mobile-open");

    // Phát event logout để các hook cleanup (useCrossTabSync, ...)
    try {
      window.dispatchEvent(new CustomEvent("logout"));
    } catch {}

    navigate("/");
  };
'@

    if ($c.Contains($oldLogout.TrimEnd())) {
        $c = $c.Replace($oldLogout.TrimEnd(), $newLogout.TrimEnd())
        Set-Content "src\App.jsx" $c -Encoding UTF8 -NoNewline
        Ok "App.jsx -> dispatch event logout"
    } else {
        Warn "App.jsx - không match, skip"
    }
}

# ============================================================
# STEP 5: Ghi lại useCrossTabSync.js
# ============================================================
Step "STEP 5: Fix useCrossTabSync.js"

$hooksPath = "src\hooks\useCrossTabSync.js"
if (Test-Path $hooksPath) {
    $content = @'
// ============================================================
// useCrossTabSync.js — Sync state giữa các tab qua localStorage
// ============================================================
import { useEffect, useState, useCallback } from "react";

export function useCrossTabSync(key, defaultValue = null) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== key) return;
      try {
        const next = e.newValue ? JSON.parse(e.newValue) : defaultValue;
        setValue(next);
      } catch {
        setValue(defaultValue);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [key, defaultValue]);

  // Reset khi auth-expired / logout
  useEffect(() => {
    const reset = () => {
      try {
        localStorage.removeItem(key);
      } catch {}
      setValue(defaultValue);
    };
    window.addEventListener("auth-expired", reset);
    window.addEventListener("logout", reset);
    return () => {
      window.removeEventListener("auth-expired", reset);
      window.removeEventListener("logout", reset);
    };
  }, [key, defaultValue]);

  const set = useCallback(
    (next) => {
      try {
        const value = typeof next === "function" ? next(value) : next;
        if (value === null || value === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(value));
        }
        setValue(value);
      } catch (err) {
        console.error(`[useCrossTabSync] ${key}:`, err);
      }
    },
    [key, value]
  );

  return [value, set];
}
'@
    Set-Content $hooksPath $content -Encoding UTF8 -NoNewline
    Ok "useCrossTabSync.js -> đã ghi lại"
}

# ============================================================
# STEP 6: Ghi lại autoTranslate.js — cache bền vững
# ============================================================
Step "STEP 6: Fix autoTranslate.js - cache persistent"

$atPath = "autoTranslate.js"
if (Test-Path $atPath) {
    $content = @'
// ============================================================
// AUTO TRANSLATE — Dịch text qua Google Translate (free)
// Cache memory + persist xuống file + fallback về tiếng Việt
// ============================================================

import fetch from "node-fetch";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, "translate-cache.json");

const memoryCache = new Map();
let saveTimer = null;

function loadCacheFromFile() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      const obj = JSON.parse(raw);
      for (const [k, v] of Object.entries(obj)) {
        memoryCache.set(k, v);
      }
      console.log(`[translate] Loaded ${memoryCache.size} cached entries`);
    }
  } catch (e) {
    console.warn("[translate] Cannot load cache:", e.message);
  }
}

function scheduleSaveCache() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const obj = {};
      for (const [k, v] of memoryCache.entries()) obj[k] = v;
      fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), "utf-8");
    } catch (e) {
      console.warn("[translate] Cannot save cache:", e.message);
    }
    saveTimer = null;
  }, 3000);
}

loadCacheFromFile();

function cacheKey(text, lang) {
  return `${text}||${lang}`;
}

export async function translateOne(text, targetLang) {
  if (!text || !String(text).trim()) return "";
  if (targetLang === "vi") return text;

  const key = cacheKey(text, targetLang);
  if (memoryCache.has(key)) return memoryCache.get(key);

  try {
    const url =
      `https://translate.googleapis.com/translate_a/single` +
      `?client=gtx&sl=vi&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    const res = await fetch(url, { timeout: 5000 });
    if (!res.ok) throw new Error("API failed");

    const data = await res.json();
    const translated =
      data?.[0]?.map((seg) => seg?.[0]).filter(Boolean).join("") || text;

    memoryCache.set(key, translated);
    scheduleSaveCache();
    return translated;
  } catch (err) {
    console.warn(`[translate] fail "${text}" -> ${targetLang}:`, err.message);
    return text;
  }
}

export async function translateFields(obj, fields, targetLangs) {
  if (!obj) return obj;
  const plain = obj.toObject ? obj.toObject() : { ...obj };
  const tasks = [];

  for (const lang of targetLangs) {
    for (const field of fields) {
      const text = plain[field];
      if (!text || plain[`${field}_${lang}`]) continue;
      tasks.push(
        translateOne(text, lang).then((translated) => {
          plain[`${field}_${lang}`] = translated;
        })
      );
    }
  }

  await Promise.all(tasks);
  return plain;
}

export async function translateList(items, fields, targetLangs) {
  if (!Array.isArray(items)) return items;
  return Promise.all(items.map((it) => translateFields(it, fields, targetLangs)));
}

export function getCacheSize() {
  return memoryCache.size;
}
'@
    Set-Content $atPath $content -Encoding UTF8 -NoNewline
    Ok "autoTranslate.js -> cache persistent"
}

# ============================================================
# STEP 7: Validate pickupTime trong server-json.js
# ============================================================
Step "STEP 7: Fix server-json.js - validate pickupTime"

$sjPath = "server-json.js"
if (Test-Path $sjPath) {
    $c = Get-Content $sjPath -Raw -Encoding UTF8

    $oldBlock = @'
if (note) {
      const match = String(note).match(/Nhận lúc\s+(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})/);
      if (match) {
        const slotId = match[1].replace(/\s/g, "");
        const slots = getTimeSlots(db);
        const slot = slots.find((s) => s.id === slotId);
        if (slot && !slot.enabled) {
          return res.status(400).json({
            message: `Khung giờ ${slotId} đã kín hoặc tạm ngưng. Vui lòng chọn khung giờ khác.`,
          });
        }
      }
    }
'@

    $newBlock = @'
// FIX: Validate pickupTime trực tiếp từ body (không parse từ note)
    const pickupTimeFromBody = req.body.pickupTime || "";
    if (pickupTimeFromBody) {
      const slotCheck = validatePickupTime(db, pickupTimeFromBody);
      if (!slotCheck.ok) {
        return res.status(400).json({ message: slotCheck.message });
      }
    }
'@

    if ($c.Contains($oldBlock)) {
        $c = $c.Replace($oldBlock, $newBlock)
        Set-Content $sjPath $c -Encoding UTF8 -NoNewline
        Ok "server-json.js -> validate pickupTime từ body"
    } else {
        Warn "server-json.js - không match block cũ (có thể đã fix rồi)"
    }
}

# ============================================================
# STEP 8: Tạo script dọn i18n source
# ============================================================
Step "STEP 8: Tạo scripts\cleanup-i18n-source.mjs"

New-Item -ItemType Directory -Force -Path "scripts" | Out-Null

$cleanupScript = @'
#!/usr/bin/env node
// CLEANUP-I18N-SOURCE.MJS - Xóa key rác (self-reference)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_FILE = path.join(
  __dirname, "..", "src", "lib", "i18n", "locales", "_source.json"
);

if (!fs.existsSync(SOURCE_FILE)) {
  console.error("[X] Khong tim thay _source.json");
  process.exit(1);
}

const backup = SOURCE_FILE.replace(".json", `.backup-${Date.now()}.json`);
fs.copyFileSync(SOURCE_FILE, backup);
console.log(`[Backup] ${path.basename(backup)}`);

const source = JSON.parse(fs.readFileSync(SOURCE_FILE, "utf-8"));
const before = Object.keys(source).length;

const cleaned = {};
const removed = [];

for (const [k, v] of Object.entries(source)) {
  const isDotKey = k.includes(".") && !k.includes(" ");
  const isSelfRef = k === v;
  if (isDotKey && isSelfRef) {
    removed.push(k);
    continue;
  }
  cleaned[k] = v;
}

fs.writeFileSync(SOURCE_FILE, JSON.stringify(cleaned, null, 2), "utf-8");

console.log(`\n[OK] Da xoa ${removed.length} key rac`);
console.log(`   Truoc: ${before} keys`);
console.log(`   Sau:   ${Object.keys(cleaned).length} keys\n`);

if (removed.length > 0 && removed.length <= 30) {
  removed.forEach((k) => console.log(`   - ${k}`));
} else if (removed.length > 30) {
  removed.slice(0, 30).forEach((k) => console.log(`   - ${k}`));
  console.log(`   ... va ${removed.length - 30} key khac`);
}
'@

$cleanupScript | Out-File -FilePath "scripts\cleanup-i18n-source.mjs" -Encoding UTF8 -NoNewline
Ok "Đã tạo scripts\cleanup-i18n-source.mjs"

# ============================================================
# STEP 9: Cập nhật .gitignore
# ============================================================
Step "STEP 9: Cập nhật .gitignore"

$gitignoreAdd = @'

# Quick fix additions
translate-cache.json
*.backup-*.json
.backup-quickfix/
*.bak
'@

if (Test-Path ".gitignore") {
    $gi = Get-Content ".gitignore" -Raw -Encoding UTF8
    if ($gi -notmatch 'translate-cache\.json') {
        Add-Content ".gitignore" $gitignoreAdd -Encoding UTF8
        Ok ".gitignore -> đã thêm rule mới"
    } else {
        Warn ".gitignore -> đã có rule, skip"
    }
} else {
    $gitignoreAdd | Out-File -FilePath ".gitignore" -Encoding UTF8 -NoNewline
    Ok ".gitignore -> đã tạo mới"
}

# ============================================================
# STEP 10: Chạy cleanup i18n source
# ============================================================
Step "STEP 10: Chạy cleanup i18n source"

if (Test-Path "scripts\cleanup-i18n-source.mjs") {
    node scripts\cleanup-i18n-source.mjs
}

# ============================================================
# STEP 11: Verify (dùng Select-String thay regex)
# ============================================================
Step "STEP 11: Verify"

$PASS = 0
$FAIL = 0

function Check($name, $condition) {
    Write-Host "   $name" -NoNewline
    if ($condition) {
        Write-Host " [OK]" -ForegroundColor Green
        $script:PASS++
    } else {
        Write-Host " [FAIL]" -ForegroundColor Red
        $script:FAIL++
    }
}

function FileContains {
    param([string]$File, [string]$Needle)
    if (-not (Test-Path $File)) { return $false }
    $content = Get-Content $File -Raw -Encoding UTF8
    return $content.Contains($Needle)
}

Check "api.js có listActive" (FileContains "api.js" "listActive")
Check "autoTranslate.js có CACHE_FILE" (FileContains "autoTranslate.js" "CACHE_FILE")
Check "useCrossTabSync có auth-expired" (FileContains "src\hooks\useCrossTabSync.js" "auth-expired")
Check "App.jsx dispatch logout" (FileContains "src\App.jsx" "new CustomEvent(`"logout`")")
Check "OwnerMenu DEBUG env" (FileContains "src\pages\owner\OwnerMenu.jsx" "import.meta.env.DEV")
Check "scripts\cleanup-i18n-source.mjs" (Test-Path "scripts\cleanup-i18n-source.mjs")

# ============================================================
# FINAL
# ============================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                    KET QUA                                " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  PASS: $PASS" -ForegroundColor Green
Write-Host "  FAIL: $FAIL" -ForegroundColor Red
Write-Host ""

if ($FAIL -eq 0) {
    Write-Host "[OK] FIX HOAN TAT!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Buoc tiep theo:" -ForegroundColor Cyan
    Write-Host "   npm start     # Chay FE + BE" -ForegroundColor White
    Write-Host ""
    Write-Host "Backup luu tai: .backup-quickfix/" -ForegroundColor Gray
    exit 0
} else {
    Write-Host "[!] Con $FAIL muc can kiem tra thu cong." -ForegroundColor Yellow
    Write-Host "   Backup luu tai: .backup-quickfix/" -ForegroundColor Gray
    exit 1
}