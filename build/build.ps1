$ErrorActionPreference = "Stop"

$root = Resolve-Path "$PSScriptRoot\.."
$manifest = Get-Content "$root\manifest.json" -Raw | ConvertFrom-Json
$version = $manifest.version

$staging = Join-Path $root "build\staging"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

$includePaths = @("manifest.json", "_locales", "src", "assets\icons")
foreach ($p in $includePaths) {
    $src = Join-Path $root $p
    $dst = Join-Path $staging $p
    if (Test-Path $src -PathType Container) {
        New-Item -ItemType Directory -Path $dst -Force | Out-Null
        Copy-Item "$src\*" $dst -Recurse -Force
    } else {
        Copy-Item $src $dst -Force
    }
}

Get-ChildItem $root -Filter "$($manifest.short_name)-v*.zip" | Remove-Item -Force

$zipPath = Join-Path $root "$($manifest.short_name)-v$version.zip"
Compress-Archive -Path "$staging\*" -DestinationPath $zipPath -Force

Remove-Item $staging -Recurse -Force

Write-Host "Built $zipPath"
