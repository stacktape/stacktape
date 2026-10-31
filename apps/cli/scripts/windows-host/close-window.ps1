# Closes the console window of -TargetPid on the hidden desktop -DesktopName, as clicking its X does: Windows sends
# CTRL_CLOSE_EVENT to the program and ends it 5 seconds later.
param([Parameter(Mandatory)][int]$TargetPid, [Parameter(Mandatory)][string]$DesktopName)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'load-host.ps1')
if ([StacktapeWsl.Host]::CloseWindows($DesktopName, $TargetPid) -eq 0) { Write-Error "Process $TargetPid has no window on $DesktopName."; exit 2 }
