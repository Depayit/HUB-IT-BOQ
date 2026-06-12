# Restore Sprint 8 files from git staging area to working tree.
# Use when files show as "AD" (staged but missing on disk) in git status.
#
# Usage (from repo root):
#   powershell -File scripts/restore-staged-sprint8.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path (Split-Path $PSScriptRoot -Parent) -Leaf) 2>$null
if (-not (Test-Path ".git")) {
  Set-Location $PSScriptRoot\..
}
if (-not (Test-Path ".git")) {
  throw "Run from HUB IT BOQ repo root"
}

$paths = @(
  "docs/SPRINT_8",
  "scripts/seed-s8-wave1-scenarios.mjs",
  "scripts/execute-s8-wave1-official.mjs",
  "scripts/lib/s8-wave1-evidence.mjs"
)

$restored = 0
foreach ($p in $paths) {
  $staged = git diff --cached --name-only -- $p 2>$null
  foreach ($f in $staged) {
    if ($f) {
      git checkout-index -f -- $f
      Write-Host "Restored: $f"
      $restored++
    }
  }
}

if ($restored -eq 0) {
  Write-Host "No staged Sprint 8 paths found. Run 'git add docs/SPRINT_8 scripts/' first, or commit to lock files permanently."
} else {
  Write-Host "Done. Restored $restored file(s). Recommend: git commit to prevent recurrence."
}
