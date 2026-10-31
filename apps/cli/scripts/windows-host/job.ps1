# Lists the processes in the task's job object as JSON (host.cs puts every program the helper starts there, and their
# children cannot leave it), except its keeper. With -Stop, terminates the job first and lists what is still exiting.
param([Parameter(Mandatory)][ValidatePattern('^[a-z0-9][a-z0-9-]{0,31}$')][string]$Task, [switch]$Stop)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'load-host.ps1')
if ($Stop) {
  [void][StacktapeWsl.Host]::TerminateJob($Task)
  $deadline = (Get-Date).AddSeconds(10)
  while ([StacktapeWsl.Host]::ListJob($Task).Count -gt 0 -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 200 }
  # The keeper ended with the job, so its name is gone and ListJob below returns nothing.
}
$ids = [StacktapeWsl.Host]::ListJob($Task)
$processes = @(foreach ($id in $ids) { Get-CimInstance Win32_Process -Filter "ProcessId=$id" })
# The keeper (keep-job.ps1) and its hidden console belong to the job but are the helper's, not the task's.
$keepers = @($processes | Where-Object { $_.CommandLine -like '*keep-job.ps1*' } | ForEach-Object { [int]$_.ProcessId })
$list = @($processes | Where-Object {
  $keepers -notcontains [int]$_.ProcessId -and -not ($_.Name -eq 'conhost.exe' -and $keepers -contains [int]$_.ParentProcessId)
} | ForEach-Object {
  [ordered]@{ pid = [int]$_.ProcessId; parentPid = [int]$_.ParentProcessId; name = $_.Name; path = $_.ExecutablePath }
})
ConvertTo-Json -InputObject $list -Compress -Depth 3
