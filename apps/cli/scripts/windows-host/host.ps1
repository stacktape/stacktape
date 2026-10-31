# Starts one program for windows-host.ts through host.cs, inside the task's job object, and exits with its exit code.
# -Mode exec inherits the standard handles (piped output to WSL), pty runs it in a pseudo console with no window, window
# in a console window on the hidden desktop -DesktopName. Each start is also listed in -RecordFile, for display only.
param(
  [Parameter(Mandatory)][ValidatePattern('^[a-z0-9][a-z0-9-]{0,31}$')][string]$Task,
  [Parameter(Mandatory)][ValidateSet('exec', 'pty', 'window')][string]$Mode,
  [Parameter(Mandatory)][string]$CommandLine,
  [Parameter(Mandatory)][string]$Program,
  [Parameter(Mandatory)][string]$WorkingDirectory,
  [Parameter(Mandatory)][string]$RecordFile,
  [Parameter(Mandatory)][string]$ExpectedProfile,
  [string]$StateFile,
  [string]$OutputFile,
  [string]$DesktopName,
  [int]$Columns = 120,
  [int]$Rows = 40
)
$ErrorActionPreference = 'Stop'

# The helper forwards AWS_PROFILE through WSLENV. If anything dropped or replaced it, the program would use the
# default credentials, so refuse to start it.
if ($env:AWS_PROFILE -ne $ExpectedProfile) {
  [Console]::Error.WriteLine("windows-host: the Windows side sees AWS_PROFILE='$env:AWS_PROFILE', expected '$ExpectedProfile'; not starting.")
  exit 125
}

. (Join-Path $PSScriptRoot 'load-host.ps1')

[StacktapeWsl.Host]::KeeperScript = Join-Path $PSScriptRoot 'keep-job.ps1'
[StacktapeWsl.Host]::IgnoreCtrlC()
switch ($Mode) {
  'exec' { exit [StacktapeWsl.Host]::Exec($Task, $CommandLine, $WorkingDirectory, $RecordFile, $Program) }
  'pty' {
    exit [StacktapeWsl.Host]::Pty($Task, $CommandLine, $WorkingDirectory, $RecordFile, $StateFile, $OutputFile,
      [int16]$Columns, [int16]$Rows, $Program)
  }
  'window' {
    $conhostPid = [StacktapeWsl.Host]::Window($Task, $CommandLine, $WorkingDirectory, $RecordFile, $Program, $DesktopName)
    $launched = $null
    $deadline = (Get-Date).AddSeconds(15)
    while (-not $launched -and (Get-Date) -lt $deadline) {
      $child = Get-CimInstance Win32_Process -Filter "ParentProcessId=$conhostPid" | Where-Object { $_.Name -ne 'conhost.exe' } |
        Select-Object -First 1
      if ($child) {
        try { $launched = [Diagnostics.Process]::GetProcessById([int]$child.ProcessId); $null = $launched.Handle } catch { $launched = $null }
      }
      if (-not $launched) { Start-Sleep -Milliseconds 100 }
    }
    [StacktapeWsl.Host]::AssertNoReparsePoints($StateFile)
    if (-not $launched) {
      @{ mode = 'window'; conhostPid = $conhostPid; error = 'The program did not start or exited immediately.' } |
        ConvertTo-Json -Compress | Set-Content -Encoding utf8 -LiteralPath $StateFile
      exit 125
    }
    @{ mode = 'window'; conhostPid = $conhostPid; pid = $launched.Id } | ConvertTo-Json -Compress |
      Set-Content -Encoding utf8 -LiteralPath $StateFile
    $launched.WaitForExit()
    $exitCode = $launched.ExitCode
    @{ mode = 'window'; conhostPid = $conhostPid; pid = $launched.Id; exitCode = $exitCode } | ConvertTo-Json -Compress |
      Set-Content -Encoding utf8 -LiteralPath $StateFile
    exit $exitCode
  }
}
