# Lists, as JSON, every process started from -TaskDirectory (by executable path or command line) and all of their
# descendants. With -Stop, ends each tree with `taskkill /t /f`, which needs no console and reaches grandchildren.
param([Parameter(Mandatory)][string]$TaskDirectory, [switch]$Stop)
$ErrorActionPreference = 'Stop'
$all = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, ExecutablePath, CommandLine)
$prefix = $TaskDirectory.TrimEnd('\') + '\'
$self = $PID
$owned = @{}
foreach ($process in $all) {
  if ($process.ProcessId -eq $self) { continue }
  if (($process.ExecutablePath -and $process.ExecutablePath.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) -or
      ($process.CommandLine -and $process.CommandLine.IndexOf($prefix, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
       $process.CommandLine -notmatch 'processes\.ps1')) {
    $owned[$process.ProcessId] = $process
  }
}
do {
  $added = $false
  foreach ($process in $all) {
    if (-not $owned.ContainsKey($process.ProcessId) -and $owned.ContainsKey($process.ParentProcessId) -and $process.ProcessId -ne $self) {
      $owned[$process.ProcessId] = $process; $added = $true
    }
  }
} while ($added)
$list = @($owned.Values | Sort-Object ProcessId | ForEach-Object {
  [ordered]@{ pid = $_.ProcessId; parentPid = $_.ParentProcessId; name = $_.Name; path = $_.ExecutablePath }
})
if ($Stop) {
  foreach ($process in $list) {
    if (-not $owned.ContainsKey($process.parentPid)) { & taskkill.exe /pid $process.pid /t /f *> $null }
  }
}
ConvertTo-Json -InputObject $list -Compress -Depth 3
