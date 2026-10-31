# Keeps the task's job object open while it has processes (see host.cs: a job's name disappears with its last handle).
# host.cs starts one per program, inside the job, with a console but no window, and hands it the job handle; it exits
# when the job holds nothing but keepers and console hosts. Startup errors go to logs\keeper-error.txt, because nothing
# reads its output.
param([Parameter(Mandatory)][ValidatePattern('^[a-z0-9][a-z0-9-]{0,31}$')][string]$Task)
$ErrorActionPreference = 'Stop'
try {
  . (Join-Path $PSScriptRoot 'load-host.ps1')
  [StacktapeWsl.Host]::KeepJob($Task)
} catch {
  $log = Join-Path (Split-Path $PSScriptRoot) 'logs\keeper-error.txt'
  [StacktapeWsl.Host]::AssertNoReparsePoints($log)
  Set-Content -LiteralPath $log -Value $_.ToString()
  exit 1
}
