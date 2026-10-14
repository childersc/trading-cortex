param(
    [Parameter(Mandatory = $true)]
    [string]$Version,

    [Parameter(Mandatory = $false)]
    [string]$Notes = "- Performance and stability improvements."
)

$ErrorActionPreference = "Stop"
$CleanVer = $Version.TrimStart("v", "V")
$Tag = "v$CleanVer"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ">>> Preparing Trading Cortex release $Tag..." -ForegroundColor Cyan

# 1. Update manifest.json version
$ManifestPath = Join-Path $ProjectRoot "manifest.json"
$ManifestRaw = Get-Content $ManifestPath -Raw
$ManifestUpdated = $ManifestRaw -replace '"version":\s*"[^"]+"', "`"version`": `"$CleanVer`""
Set-Content -Path $ManifestPath -Value $ManifestUpdated -Encoding UTF8

# 2. Build release zip in dist/
$DistDir = Join-Path $ProjectRoot "dist"
if (!(Test-Path $DistDir)) {
    New-Item -ItemType Directory -Path $DistDir | Out-Null
}
$ZipPath = Join-Path $DistDir "trading-cortex-$CleanVer.zip"
if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
}

$ItemsToPackage = @(
    "manifest.json",
    "background",
    "content",
    "icons",
    "popup",
    "update",
    "README.md"
) | ForEach-Object { Join-Path $ProjectRoot $_ } | Where-Object { Test-Path $_ }

Compress-Archive -Path $ItemsToPackage -DestinationPath $ZipPath -Force
Write-Host ">>> Packaged $ZipPath" -ForegroundColor Green

# 3. Commit, Tag, and Push to GitHub
Push-Location $ProjectRoot
try {
    git add -A
    git commit -m "Release $Tag`n`n$Notes" --allow-empty
    git tag -f $Tag
    git push origin main
    git push origin $Tag --force
    Write-Host ">>> Pushed $Tag to GitHub (childersc/trading-cortex)!" -ForegroundColor Green
} finally {
    Pop-Location
}
