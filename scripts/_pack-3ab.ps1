$root = 'C:\dev\HUB IT BOQ'
$out = 'C:\dev\HUB IT BOQ\HUB_IT_BOQ_Sprint_3AB.zip'
$staging = Join-Path $root '_pack_staging_3ab'
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null
@('src','prisma','tests','scripts','docs','package.json','package-lock.json','tsconfig.json','next.config.ts','postcss.config.mjs','eslint.config.mjs','README.md','vitest.config.ts') | ForEach-Object {
  $src = Join-Path $root $_
  if (Test-Path $src) {
    Copy-Item $src (Join-Path $staging $_) -Recurse -Force
  }
}
if (Test-Path $out) { Remove-Item $out -Force }
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $out -Force
Remove-Item $staging -Recurse -Force
Write-Host "Created $out"