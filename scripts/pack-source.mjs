/**
 * Create HUB_IT_BOQ_Sprint_3AB.zip (source without node_modules/.next).
 */
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "HUB_IT_BOQ_Sprint_3AB.zip");

const INCLUDE = [
  "src",
  "prisma",
  "tests",
  "scripts",
  "docs",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next.config.ts",
  "postcss.config.mjs",
  "eslint.config.mjs",
  "README.md",
  "vitest.config.ts",
];

const ps1 = path.join(__dirname, "_pack-3ab.ps1");
const includeList = INCLUDE.map((i) => `'${i}'`).join(",");

writeFileSync(
  ps1,
  `
$root = '${ROOT.replace(/'/g, "''")}'
$out = '${OUT.replace(/'/g, "''")}'
$staging = Join-Path $root '_pack_staging_3ab'
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null
@(${includeList}) | ForEach-Object {
  $src = Join-Path $root $_
  if (Test-Path $src) {
    Copy-Item $src (Join-Path $staging $_) -Recurse -Force
  }
}
if (Test-Path $out) { Remove-Item $out -Force }
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $out -Force
Remove-Item $staging -Recurse -Force
Write-Host "Created $out"
`.trim(),
  "utf8",
);

execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${ps1}"`, {
  stdio: "inherit",
  cwd: ROOT,
});
