# Lists every Windows process as JSON (PID, parent, name, executable, creation time in UTC). windows-host.ts decides
# which belong to the task (selectOwnedProcesses in core.ts). With -Stop, ends the given processes, each only if its
# PID still has the given creation time, so a PID reused since the listing is never touched.
param([string]$Stop)
$ErrorActionPreference = 'Stop'
if ($Stop) {
  foreach ($entry in ($Stop | ConvertFrom-Json)) {
    $process = Get-Process -Id ([int]$entry.pid) -ErrorAction SilentlyContinue
    if (-not $process) { continue }
    $created = $process.StartTime.ToUniversalTime()
    if ([Math]::Abs(($created - ([datetime]$entry.created).ToUniversalTime()).TotalMilliseconds) -gt 1000) { continue }
    try { $process.Kill() } catch { }
  }
  exit 0
}
$list = @(Get-CimInstance Win32_Process | ForEach-Object {
  [ordered]@{
    pid = [int]$_.ProcessId
    parentPid = [int]$_.ParentProcessId
    name = $_.Name
    path = $_.ExecutablePath
    created = $_.CreationDate.ToUniversalTime().ToString('o')
  }
})
ConvertTo-Json -InputObject $list -Compress -Depth 3
