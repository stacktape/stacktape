# Asks the console window of -TargetPid to close, as clicking its X does. Fails when the process has no window,
# for example one started with piped output.
param([Parameter(Mandatory)][int]$TargetPid)
$ErrorActionPreference = 'Stop'
$process = Get-Process -Id $TargetPid
if ($process.MainWindowHandle -eq 0) { Write-Error "Process $TargetPid has no window."; exit 2 }
if (-not $process.CloseMainWindow()) { exit 3 }
