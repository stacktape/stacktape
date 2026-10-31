# Writes -Base64 bytes to the input pipe of a pseudo console started by host.cs (the keys command).
param([Parameter(Mandatory)][ValidatePattern('^stacktape-wsl-[a-z0-9-]+-input-[0-9]+$')][string]$PipeName, [Parameter(Mandatory)][string]$Base64)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'load-host.ps1')
[StacktapeWsl.Host]::SendInput($PipeName, [Convert]::FromBase64String($Base64))
