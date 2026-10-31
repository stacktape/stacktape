# Raises Ctrl+C (or Ctrl+Break) in the console of -TargetPid, like a user pressing it there. Every process attached
# to that console receives it, as with a real key press; processes in other consoles do not.
param([Parameter(Mandatory)][int]$TargetPid, [switch]$Break)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'console-native.ps1')
Connect-StacktapeConsole $TargetPid
# Ignore the event in this process, which now shares the target's console.
[void][StacktapeWsl.Native]::SetConsoleCtrlHandler([IntPtr]::Zero, $true)
$sent = [StacktapeWsl.Native]::GenerateConsoleCtrlEvent([uint32]($(if ($Break) { 1 } else { 0 })), 0)
Start-Sleep -Milliseconds 300
[void][StacktapeWsl.Native]::FreeConsole()
if (-not $sent) { exit 3 }
