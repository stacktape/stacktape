#!/usr/bin/env pwsh
# Copyright 2018 the Deno and Fly.io authors. All rights reserved. MIT license.

$ErrorActionPreference = 'Stop'

$Version = if ($v) {
  $v
} elseif ($args.Length -eq 1) {
  $args.Get(0)
} else {
  "latest"
}

$BinDirPath = "$Home\.stacktape\bin"
$ExecutableFilePath = "$BinDirPath\stacktape.exe"
$ZipFilePath = "$BinDirPath\stacktape.zip"
$ZipSourceUrl = "https://stacktape.com/install/stacktape.zip"

if (!(Test-Path $BinDirPath)) {
  New-Item $BinDirPath -ItemType Directory | Out-Null
}

Invoke-WebRequest $ZipSourceUrl -OutFile $ZipFilePath -UseBasicParsing

if (Get-Command Expand-Archive -ErrorAction SilentlyContinue) {
  Expand-Archive $ZipFilePath -Destination $BinDirPath -Force
} else {
  Remove-Item $ExecutableFilePath -ErrorAction SilentlyContinue
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

Start-Process -FilePath "$env:comspec" -ArgumentList "/c", "mklink", $ExecutableFilePath, $ExecutableFilePath

Write-Output "Stacktape was installed successfully to $ExecutableFilePath"
Write-Output "Run 'stacktape help' for a list of available commands."
