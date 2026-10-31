# Starts -CommandLine in a new classic console window (conhost.exe, so it never opens a tab in the user's Windows
# Terminal) and waits for it. Records the program's PID and exit code in -StateFile as JSON; conhost.exe itself
# does not return the program's exit code.
param(
  [Parameter(Mandatory)][string]$CommandLine,
  [Parameter(Mandatory)][string]$WorkingDirectory,
  [Parameter(Mandatory)][string]$StateFile
)
$ErrorActionPreference = 'Stop'
$conhost = Start-Process -FilePath "$env:SystemRoot\System32\conhost.exe" -ArgumentList $CommandLine `
  -WorkingDirectory $WorkingDirectory -PassThru
$program = $null
$deadline = (Get-Date).AddSeconds(15)
while (-not $program -and (Get-Date) -lt $deadline) {
  $child = Get-CimInstance Win32_Process -Filter "ParentProcessId=$($conhost.Id)" |
    Where-Object { $_.Name -ne 'conhost.exe' } | Select-Object -First 1
  if ($child) {
    try { $program = [Diagnostics.Process]::GetProcessById([int]$child.ProcessId); $null = $program.Handle } catch { $program = $null }
  }
  if (-not $program) { Start-Sleep -Milliseconds 100 }
}
if (-not $program) {
  @{ conhostPid = $conhost.Id; error = 'The program did not start or exited immediately.' } | ConvertTo-Json -Compress |
    Set-Content -Encoding utf8 $StateFile
  exit 125
}
@{ conhostPid = $conhost.Id; pid = $program.Id; startedAt = (Get-Date).ToString('o') } | ConvertTo-Json -Compress |
  Set-Content -Encoding utf8 $StateFile
$program.WaitForExit()
$exitCode = $program.ExitCode
@{ conhostPid = $conhost.Id; pid = $program.Id; exitCode = $exitCode; exitedAt = (Get-Date).ToString('o') } |
  ConvertTo-Json -Compress | Set-Content -Encoding utf8 $StateFile
exit $exitCode
