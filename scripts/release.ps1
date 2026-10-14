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

# 1b. Update RELEASE_NOTES.md if custom notes were passed
$ReleaseNotesPath = Join-Path $ProjectRoot "RELEASE_NOTES.md"
if ($PSBoundParameters.ContainsKey('Notes') -or !(Test-Path $ReleaseNotesPath)) {
    Set-Content -Path $ReleaseNotesPath -Value $Notes -Encoding UTF8
}

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
    "README.md",
    "RELEASE_NOTES.md"
) | ForEach-Object { Join-Path $ProjectRoot $_ } | Where-Object { Test-Path $_ }

Compress-Archive -Path $ItemsToPackage -DestinationPath $ZipPath -Force
Write-Host ">>> Packaged $ZipPath" -ForegroundColor Green

# 3. Commit, Tag, and Push to GitHub (Push branch first, then push tag separately so GitHub Actions triggers on the tag event)
Push-Location $ProjectRoot
try {
    $ErrorActionPreference = "Continue"
    git add -A
    git commit -m "Release $Tag`n`n$Notes" --allow-empty
    git push origin main
    git tag -f $Tag
    git push origin $Tag --force
    Write-Host ">>> Pushed $Tag to GitHub (childersc/trading-cortex)!" -ForegroundColor Green
} finally {
    Pop-Location
}
