# ============================================================
# MIGRATE 2 FILE SANG useI18n MOI
# ============================================================

$files = @(
    "src\pages\customer\CustomerHome.jsx",
    "src\pages\owner\OwnerMenu.jsx"
)

foreach ($f in $files) {
    if (-not (Test-Path $f)) {
        Write-Host "[SKIP] $f khong ton tai" -ForegroundColor Yellow
        continue
    }

    $content = Get-Content $f -Raw -Encoding UTF8

    # 1. Doi import
    $old1 = 'import { useTranslation } from "../../i18n";'
    $new1 = 'import { useI18n } from "../../hooks/useI18n";'

    if (-not $content.Contains($old1)) {
        Write-Host "[WARN] $f - khong tim thay import cu: $old1" -ForegroundColor Yellow
        # Thu bien the khac
        if ($content -match 'import\s+\{\s*useTranslation\s*\}\s+from\s+["'']\.\./\.\./i18n["''];?') {
            $content = $content -replace 'import\s+\{\s*useTranslation\s*\}\s+from\s+["'']\.\./\.\./i18n["''];?', $new1
            Write-Host "[OK] $f - da doi import (fallback regex)" -ForegroundColor Green
        }
    } else {
        $content = $content.Replace($old1, $new1)
        Write-Host "[OK] $f - da doi import" -ForegroundColor Green
    }

    # 2. Doi hook call: const { t, lang } = useTranslation();  ->  const { t, tData, lang } = useI18n();
    $old2 = 'const { t, lang } = useTranslation();'
    $new2 = 'const { t, tData, lang } = useI18n();'

    if ($content.Contains($old2)) {
        $content = $content.Replace($old2, $new2)
        Write-Host "[OK] $f - da doi hook call" -ForegroundColor Green
    } else {
        Write-Host "[WARN] $f - khong tim thay hook call chuan" -ForegroundColor Yellow
        # Thu bien the khac: const { t, lang, ... } = useTranslation()
        $pattern = 'const\s+\{\s*([^}]*)\}\s*=\s*useTranslation\(\);'
        $match = [regex]::Match($content, $pattern)
        if ($match.Success) {
            $destructure = $match.Groups[1].Value.Trim()
            if ($destructure -notmatch '\btData\b') {
                $newDestructure = "$destructure, tData"
                $newCall = "const { $newDestructure } = useI18n();"
                $content = $content.Replace($match.Value, $newCall)
                Write-Host "[OK] $f - da doi hook call (fallback): $newCall" -ForegroundColor Green
            }
        }
    }

    Set-Content -Path $f -Value $content -Encoding UTF8 -NoNewline
}

Write-Host ""
Write-Host "Done." -ForegroundColor Cyan
