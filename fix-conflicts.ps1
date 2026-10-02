# ============================================================
# FIX-CONFLICTS.PS1 — Auto resolve conflicts after pull
# ============================================================
# Usage:
#   .\fix-conflicts.ps1                  # keep REMOTE (default)
#   .\fix-conflicts.ps1 -Keep local      # keep LOCAL
#   .\fix-conflicts.ps1 -DryRun          # preview only
#   .\fix-conflicts.ps1 -NoPush          # commit only
# ============================================================

param(
    [ValidateSet("remote", "local", "manual")]
    [string]$Keep = "remote",
    [switch]$DryRun,
    [switch]$NoPush,
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"

function Write-Header($text) {
    Write-Host ""
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "===================================================" -ForegroundColor Cyan
}

function Write-Step($text) {
    Write-Host ""
    Write-Host ">> $text" -ForegroundColor Yellow
}

# 1. Check git repo
if (-not (Test-Path ".git")) {
    Write-Host "[X] Not a git repo. Run from project root." -ForegroundColor Red
    exit 1
}

Write-Header "FIX CONFLICTS"

# 2. Check merge state
$gitDir = git rev-parse --git-dir 2>$null
$inMerge = Test-Path (Join-Path $gitDir "MERGE_HEAD")
$inRebase = (Test-Path (Join-Path $gitDir "rebase-merge")) -or (Test-Path (Join-Path $gitDir "rebase-apply"))

if (-not $inMerge -and -not $inRebase) {
    Write-Host ""
    Write-Host "[i] Not in merge/rebase state. Nothing to resolve." -ForegroundColor Gray
    exit 0
}

if ($inRebase) {
    Write-Host "[!] In REBASE state - not supported." -ForegroundColor Yellow
    Write-Host "    Run: git rebase --abort  then: git pull --no-rebase" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "[*] In MERGE state" -ForegroundColor Cyan

# 3. List conflict files
Write-Step "Scanning conflict files..."

$conflictFiles = @(git diff --name-only --diff-filter=U)

if ($conflictFiles.Count -eq 0) {
    Write-Host "[OK] No conflicts found." -ForegroundColor Green
    Write-Host "     You can commit: git commit --no-edit" -ForegroundColor Gray
    exit 0
}

Write-Host ""
Write-Host "[!] Found $($conflictFiles.Count) conflict files:" -ForegroundColor Yellow
$conflictFiles | ForEach-Object { Write-Host "    - $_" -ForegroundColor Gray }

# 4. Resolve
Write-Step "Strategy: keep $Keep"

if ($Keep -eq "manual") {
    Write-Host ""
    Write-Host "[i] MANUAL mode - edit each file:" -ForegroundColor Yellow
    foreach ($f in $conflictFiles) {
        Write-Host "    $f" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "    Fix markers <<<<<<<, then: git add <file>" -ForegroundColor Gray
    Write-Host "    After fixing all: re-run this script" -ForegroundColor Cyan
    exit 0
}

$checkoutFlag = if ($Keep -eq "remote") { "--theirs" } else { "--ours" }

Write-Host "    Using: git checkout $checkoutFlag" -ForegroundColor Gray

if ($DryRun) {
    Write-Host ""
    Write-Host "[i] DRY RUN - commands that would run:" -ForegroundColor Cyan
    foreach ($f in $conflictFiles) {
        Write-Host "    git checkout $checkoutFlag -- `"$f`"" -ForegroundColor Gray
        Write-Host "    git add -- `"$f`"" -ForegroundColor Gray
    }
    exit 0
}

$resolved = 0
$failed = @()

foreach ($f in $conflictFiles) {
    try {
        git checkout $checkoutFlag -- "$f" 2>$null
        if ($LASTEXITCODE -ne 0) { throw "checkout failed" }
        git add -- "$f" 2>$null
        if ($LASTEXITCODE -ne 0) { throw "add failed" }
        Write-Host "    [OK] $f" -ForegroundColor Green
        $resolved++
    } catch {
        Write-Host "    [X] $f - $_" -ForegroundColor Red
        $failed += $f
    }
}

Write-Host ""
Write-Host "[*] Resolved: $resolved / $($conflictFiles.Count)" -ForegroundColor Cyan

if ($failed.Count -gt 0) {
    Write-Host ""
    Write-Host "[!] Failed to resolve:" -ForegroundColor Yellow
    $failed | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow }
    exit 1
}

# 5. Check conflict markers
Write-Step "Scanning for conflict markers..."

$markers = Get-ChildItem -Recurse -Path . `
    -Include *.js,*.jsx,*.ts,*.tsx,*.json,*.css,*.scss,*.html,*.svg,*.md `
    -ErrorAction SilentlyContinue |
    Where-Object {
        $_.FullName -notmatch "\\node_modules\\" -and
        $_.FullName -notmatch "\\\.git\\" -and
        $_.FullName -notmatch "\\dist\\" -and
        $_.FullName -notmatch "\\build\\"
    } |
    Select-String -Pattern '^(<{7}|={7}|>{7}) ' -List |
    Select-Object -ExpandProperty Path -Unique

if ($markers -and $markers.Count -gt 0) {
    Write-Host ""
    Write-Host "[!] Conflict markers still present:" -ForegroundColor Yellow
    $markers | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "    Fix markers manually, then re-run." -ForegroundColor Cyan
    exit 1
}

Write-Host "    [OK] No conflict markers" -ForegroundColor Green

# 6. Verify no unmerged files
Write-Step "Verifying status..."

$remaining = @(git diff --name-only --diff-filter=U)
if ($remaining.Count -gt 0) {
    Write-Host ""
    Write-Host "[X] Still have $($remaining.Count) unmerged files:" -ForegroundColor Red
    $remaining | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    exit 1
}

Write-Host "    [OK] No unmerged files" -ForegroundColor Green

# 7. Commit
Write-Step "Committing merge..."

if (-not $Message) {
    $Message = "merge: resolve conflicts (keep $Keep)"
}

git commit --no-edit -m "$Message" 2>$null
if ($LASTEXITCODE -ne 0) {
    git commit --no-edit 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] Commit failed. Check: git status" -ForegroundColor Red
        exit 1
    }
}

Write-Host "    [OK] Committed" -ForegroundColor Green

# 8. Push
if ($NoPush) {
    Write-Host ""
    Write-Host "[i] Skipping push (-NoPush)" -ForegroundColor Gray
    Write-Host "    Push manually: git push origin <branch>" -ForegroundColor Gray
    exit 0
}

$branch = git branch --show-current

Write-Host ""
$ans = Read-Host "Push to origin/$branch ? (y/N)"
if ($ans -ne "y") {
    Write-Host "[i] Stopped. Push manually: git push origin $branch" -ForegroundColor Gray
    exit 0
}

Write-Step "Pushing to origin/$branch..."

git push origin $branch

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "===================================================" -ForegroundColor Green
    Write-Host "  FIX CONFLICT SUCCESS" -ForegroundColor Green
    Write-Host "===================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Branch:   $branch" -ForegroundColor Gray
    Write-Host "  Resolved: $resolved file(s)" -ForegroundColor Gray
    Write-Host "  Strategy: keep $Keep" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "[X] Push failed." -ForegroundColor Red
    Write-Host "    Try: git pull origin $branch --no-rebase" -ForegroundColor Yellow
    Write-Host "    Then re-run script." -ForegroundColor Yellow
    exit 1
}
