#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

# Colors
$Green = "`e[32m"
$Muted = "`e[2m"
$Bold = "`e[1m"
$Reset = "`e[0m"

function Write-ColorOutput {
    param(
        [string]$Level,
        [string]$Message
    )
    switch ($Level) {
        "info" { Write-Host $Message }
        "muted" { Write-Host "${Muted}${Message}${Reset}" }
        "success" { Write-Host "${Green}${Message}${Reset}" }
        "error" { Write-Host "${Message}" -ForegroundColor Red }
    }
}

$Version = if ($env:STACKTAPE_VERSION) {
    $env:STACKTAPE_VERSION
} else {
    "<<DEFAULT_VERSION>>"
}

$BinDirPath = "$Home\.stacktape\bin"
$CompletionsFilePath = "$BinDirPath\completions\powershell.ps1"
$ExecutableFilePath = "$BinDirPath\stacktape.exe"
$AltExecutableFilePath = "$BinDirPath\stp.exe"
$PackExecutableFilePath = "$BinDirPath\pack\pack.exe"
$NixpacksExecutableFilePath = "$BinDirPath\nixpacks\nixpacks.exe"
$EsbuildExecutableFilePath = "$BinDirPath\esbuild\exec.exe"
$BridgeFilesFolderPath = "$BinDirPath\bridge-files"
$ZipFilePath = "$BinDirPath\stacktape.zip"
$ZipSourceUrl = "https://github.com/stacktape/stacktape/releases/download/$Version/windows.zip"

Write-Host ""
Write-ColorOutput -Level "muted" -Message "Installing stacktape version: $Version"

if (!(Test-Path $BinDirPath)) {
    New-Item $BinDirPath -ItemType Directory | Out-Null
}

# Download with progress
$ProgressPreference = 'Continue'
try {
    Invoke-WebRequest $ZipSourceUrl -OutFile $ZipFilePath -UseBasicParsing
} catch {
    Write-ColorOutput -Level "error" -Message "Error: Failed to download from $ZipSourceUrl"
    Write-ColorOutput -Level "error" -Message $_.Exception.Message
    exit 1
}

# Extract archive
if (Get-Command Expand-Archive -ErrorAction SilentlyContinue) {
    Expand-Archive $ZipFilePath -Destination $BinDirPath -Force
} else {
    Remove-Item $ExecutableFilePath -ErrorAction SilentlyContinue
    Remove-Item $BridgeFilesFolderPath -Recurse -ErrorAction SilentlyContinue
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::ExtractToDirectory($ZipFilePath, $BinDirPath)
}

Remove-Item $ZipFilePath

# Add to PATH
$User = [EnvironmentVariableTarget]::User
$Path = [Environment]::GetEnvironmentVariable('Path', $User)
if (!(";$Path;".ToLower() -like "*;$BinDirPath;*".ToLower())) {
    [Environment]::SetEnvironmentVariable('Path', "$Path;$BinDirPath", $User)
    $Env:Path += ";$BinDirPath"
    Write-ColorOutput -Level "muted" -Message "Added stacktape to PATH"
}

# Create stp alias (symlink)
if (Test-Path $AltExecutableFilePath) {
    Remove-Item $AltExecutableFilePath -ErrorAction SilentlyContinue
}
try {
    Start-Process -FilePath "$env:comspec" -ArgumentList "/c", "mklink", $AltExecutableFilePath, $ExecutableFilePath -WindowStyle Hidden -Wait
} catch {
    # Symlink creation may fail without admin rights, that's ok
}

# Setup PowerShell completions
if (!(Test-Path $profile)) {
    New-Item -Path $profile -Type File -Force | Out-Null
}
if (Test-Path $CompletionsFilePath) {
    $ProfileContent = Get-Content -Path $profile -Raw -ErrorAction SilentlyContinue
    if ($ProfileContent -notmatch "Stacktape completion script") {
        Add-Content -Path $profile -Value "`n# Stacktape completion script"
        Add-Content -Path $profile -Value (Get-Content -Path $CompletionsFilePath -Raw)
    }
}

# GitHub Actions support
if ($env:GITHUB_ACTIONS -eq "true") {
    Add-Content -Path $env:GITHUB_PATH -Value $BinDirPath
    Write-ColorOutput -Level "muted" -Message "Added $BinDirPath to GITHUB_PATH"
}

# Print success message with ASCII logo
Write-Host ""
Write-Host "${Muted}     _____ _             _    _                    ${Reset}"
Write-Host "${Muted}    / ____| |           | |  | |                   ${Reset}"
Write-Host "${Green}   | (___ | |_ __ _  ___| | _| |_ __ _ _ __   ___  ${Reset}"
Write-Host "${Green}    \___ \| __/ _`` |/ __| |/ / __/ _`` | '_ \ / _ \ ${Reset}"
Write-Host "${Green}    ____) | || (_| | (__|   <| || (_| | |_) |  __/ ${Reset}"
Write-Host "${Green}   |_____/ \__\__,_|\___|_|\_\\__\__,_| .__/ \___| ${Reset}"
Write-Host "${Green}                                      | |          ${Reset}"
Write-Host "${Green}                                      |_|          ${Reset}"
Write-Host ""
Write-Host "${Bold}${Green}Stacktape was installed successfully!${Reset}"
Write-Host ""
Write-Host "${Muted}To get started, run:${Reset}"
Write-Host ""
Write-Host "  stacktape init"
Write-Host ""
Write-Host "${Muted}For more information visit ${Reset}https://docs.stacktape.com"
Write-Host ""
