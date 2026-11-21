param(
    [Parameter(Mandatory = $false)]
    [string]$OutDir = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ManifestPath = Join-Path $ProjectRoot "manifest.json"
$ManifestObj = Get-Content $ManifestPath -Raw | ConvertFrom-Json
$Version = $ManifestObj.version

if ([string]::IsNullOrWhiteSpace($OutDir)) {
    $OutDir = Join-Path $ProjectRoot "dist"
}
if (!(Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir | Out-Null
}

# Validate CWS manifest constraints
if ($ManifestObj.manifest_version -ne 3) {
    throw "Chrome Web Store requires manifest_version 3."
}
if ($ManifestObj.description.Length -gt 132) {
    throw "manifest.json description exceeds Chrome Web Store 132-character limit ($($ManifestObj.description.Length) chars)."
}
foreach ($sz in @("16", "32", "48", "128")) {
    $iconRel = $ManifestObj.icons.$sz
    if ([string]::IsNullOrWhiteSpace($iconRel) -or !(Test-Path (Join-Path $ProjectRoot $iconRel))) {
        throw "Missing required icon size ${sz}px: $iconRel"
    }
}

# Stage clean CWS build in a temporary folder
$StageDir = Join-Path ([System.IO.Path]::GetTempPath()) ("trading-cortex-cws-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $StageDir | Out-Null

try {
    # Copy ONLY runtime extension assets (exclude tests, scripts, .git, user-data, unpacked-only update/)
    foreach ($folder in @("background", "content", "icons", "popup")) {
        Copy-Item -Path (Join-Path $ProjectRoot $folder) -Destination (Join-Path $StageDir $folder) -Recurse -Force
    }
    foreach ($doc in @("PRIVACY_POLICY.md", "README.md", "RELEASE_NOTES.md")) {
        $srcDoc = Join-Path $ProjectRoot $doc
        if (Test-Path $srcDoc) {
            Copy-Item -Path $srcDoc -Destination (Join-Path $StageDir $doc) -Force
        }
    }

    # Build a CWS-compliant manifest.json by removing unpacked-only GitHub updater host permissions
    $CwsManifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
    $CwsManifest.host_permissions = @(
        $CwsManifest.host_permissions | Where-Object {
            $_ -notmatch "github\.com|githubusercontent\.com"
        }
    )
    $CwsManifestJson = $CwsManifest | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText((Join-Path $StageDir "manifest.json"), $CwsManifestJson, (New-Object System.Text.UTF8Encoding($false)))

    $ZipPath = Join-Path $OutDir "trading-cortex-cws-$Version.zip"
    if (Test-Path $ZipPath) {
        Remove-Item $ZipPath -Force
    }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($StageDir, $ZipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

    $ZipInfo = Get-Item $ZipPath
    Write-Host ">>> Chrome Web Store package created successfully:" -ForegroundColor Green
    Write-Host "    Path:    $($ZipInfo.FullName)" -ForegroundColor Cyan
    Write-Host "    Version: v$Version" -ForegroundColor Cyan
    Write-Host "    Size:    $([math]::Round($ZipInfo.Length / 1KB, 1)) KB" -ForegroundColor Cyan
    Write-Host "    Host permissions in CWS build:" -ForegroundColor Yellow
    $CwsManifest.host_permissions | ForEach-Object { Write-Host "      - $_" }
} finally {
    if (Test-Path $StageDir) {
        Remove-Item $StageDir -Recurse -Force
    }
}
