#!/usr/bin/env pwsh
# Based on Deno installer: Copyright 2019 the Deno authors. All rights reserved. MIT license.

$ErrorActionPreference = 'Stop'

$Version = if ($env:STACKTAPE_VERSION) {
  $env:STACKTAPE_VERSION
} else {
  "<<DEFAULT_VERSION>>"
}

$BinDirPath = "$Home\.stacktape\bin"
$CompletionsFilePath = "$BinDirPath\completions\powershell.ps1"
$ExecutableFilePath = "$BinDirPath\stacktape.exe"
$AltExecutableFilePath = "$BinDirPath\stp.exe"
$EsbuildExecutableFilePath = "$BinDirPath\esbuild\exec.exe"
$PackExecutableFilePath = "$BinDirPath\pack\pack.exe"
$NixpacksExecutableFilePath = "$BinDirPath\nixpacks\nixpacks.exe"
$EsbuildRegisterFilePath = "$BinDirPath\esbuild\esbuild-register.js"
$BridgeFilesFolderPath = "$BinDirPath\bridge-files"
$ZipFilePath = "$BinDirPath\stacktape.zip"
$ZipSourceUrl = "https://github.com/stacktape/stacktape/releases/download/$Version/windows.zip"

Write-Output "Installing version $Version from $ZipSourceUrl..."

if (!(Test-Path $BinDirPath)) {
  New-Item $BinDirPath -ItemType Directory | Out-Null
}

Invoke-WebRequest $ZipSourceUrl -OutFile $ZipFilePath -UseBasicParsing

if (Get-Command Expand-Archive -ErrorAction SilentlyContinue) {
  Expand-Archive $ZipFilePath -Destination $BinDirPath -Force
} else {
  Remove-Item $ExecutableFilePath -ErrorAction SilentlyContinue
  Remove-Item $EsbuildExecutableFilePath -ErrorAction SilentlyContinue
  Remove-Item $BridgeFilesFolderPath -ErrorAction SilentlyContinue
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::ExtractToDirectory($ZipFilePath, $BinDirPath)
}

Remove-Item $ZipFilePath

$User = [EnvironmentVariableTarget]::User
$Path = [Environment]::GetEnvironmentVariable('Path', $User)
if (!(";$Path;".ToLower() -like "*;$BinDirPath;*".ToLower())) {
  [Environment]::SetEnvironmentVariable('Path', "$Path;$BinDirPath", $User)
  $Env:Path += ";$BinDirPath"
}

Start-Process -FilePath "$env:comspec" -ArgumentList "/c", "mklink", $AltExecutableFilePath, $ExecutableFilePath

if (!(Test-Path $profile)) {
  New-Item -Path $profile -Type File -Force
}
if ($null -ne (Select-String $profile -Pattern "Stacktape completion script")) {
  Add-Content -Path $profile -Value (Get-Content -Path $CompletionsFilePath)
}

Write-Output "`nStacktape was installed successfully to $BinDirPath"
Write-Output "Run 'stacktape help' for a list of available commands.`n"
