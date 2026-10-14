param(
    [Parameter(Mandatory = $false)]
    [string]$Version = "",

    [Parameter(Mandatory = $false)]
    [string]$Notes = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ManifestPath = Join-Path $ProjectRoot "manifest.json"
$ManifestObj = Get-Content $ManifestPath -Raw | ConvertFrom-Json

# If -Version was not provided, automatically increment the patch number from manifest.json (e.g. 1.1.6 -> 1.1.7)
if ([string]::IsNullOrWhiteSpace($Version)) {
    $Parts = $ManifestObj.version.Split(".")
    $Major = [int]$Parts[0]
    $Minor = [int]$Parts[1]
    $Patch = ([int]$Parts[2]) + 1
    $CleanVer = "$Major.$Minor.$Patch"
} else {
    $CleanVer = $Version.TrimStart("v", "V")
}

$Tag = "v$CleanVer"
Write-Host ">>> Preparing Trading Cortex release $Tag (dev -> main)..." -ForegroundColor Cyan

# 1. Update manifest.json version
$ManifestRaw = Get-Content $ManifestPath -Raw
$ManifestUpdated = $ManifestRaw -replace '"version":\s*"[^"]+"', "`"version`": `"$CleanVer`""
Set-Content -Path $ManifestPath -Value $ManifestUpdated -Encoding UTF8

# 1b. Update RELEASE_NOTES.md if custom notes were passed
$ReleaseNotesPath = Join-Path $ProjectRoot "RELEASE_NOTES.md"
if (-not [string]::IsNullOrWhiteSpace($Notes) -or !(Test-Path $ReleaseNotesPath)) {
    if ([string]::IsNullOrWhiteSpace($Notes)) {
        $Notes = "Trading Cortex $Tag`n`n- Performance and stability improvements."
    }
    Set-Content -Path $ReleaseNotesPath -Value $Notes -Encoding UTF8
}

# 2. Build local release zip in dist/
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

# 3. Commit on dev, merge dev -> main, push main & tag, and return to dev branch
Push-Location $ProjectRoot
try {
    $ErrorActionPreference = "Continue"
    $CurrentBranch = (git rev-parse --abbrev-ref HEAD).Trim()

    git add -A
    git commit -m "Release $Tag" --allow-empty

    if ($CurrentBranch -eq "dev") {
        git push origin dev
        git checkout main
        git merge dev --no-edit
    } elseif ($CurrentBranch -ne "main") {
        git checkout -B dev
        git push origin dev
        git checkout main
        git merge dev --no-edit
    }

    git push origin main
    git tag -f $Tag
    git push origin $Tag --force

    # Switch back to dev so day-to-day work always happens on dev
    git checkout dev
    git merge main --ff-only
    git push origin dev

    Write-Host ">>> Released $Tag to main and switched workspace back to 'dev' branch!" -ForegroundColor Green
} finally {
    Pop-Location
}
