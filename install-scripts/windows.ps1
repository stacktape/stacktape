#!/usr/bin/env pwsh
# Based on Deno installer: Copyright 2019 the Deno authors. All rights reserved. MIT license.

$ErrorActionPreference = 'Stop'

$Version = if ($env:STACKTAPE_VERSION) {
  $env:STACKTAPE_VERSION
} else {
  "<<DEFAULT_VERSION>>"
}

$BinDirPath = "$Home\.stacktape\bin"
$ExecutableFilePath = "$BinDirPath\stacktape.exe"
$AltExecutableFilePath = "$BinDirPath\stp.exe"
$EsbuildExecutableFilePath = "$BinDirPath\esbuild.exe"
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

Write-Output "`nStacktape was installed successfully to $BinDirPath"
Write-Output "Run 'stacktape help' for a list of available commands.`n"
