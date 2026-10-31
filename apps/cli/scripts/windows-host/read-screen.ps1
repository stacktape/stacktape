# Prints the text of the console that -TargetPid is attached to: the last -Lines rows up to the cursor.
param([Parameter(Mandatory)][int]$TargetPid, [int]$Lines = 60)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
. (Join-Path $PSScriptRoot 'console-native.ps1')
Connect-StacktapeConsole $TargetPid
$handle = [StacktapeWsl.Native]::CreateFileW('CONOUT$', [uint32]3221225472, 3, [IntPtr]::Zero, 3, 0, [IntPtr]::Zero)
try {
  $info = New-Object StacktapeWsl.Native+BufferInfo
  if (-not [StacktapeWsl.Native]::GetConsoleScreenBufferInfo($handle, [ref]$info)) { throw 'GetConsoleScreenBufferInfo failed' }
  $width = $info.Size.X
  $last = [Math]::Max($info.Cursor.Y, $info.Window.Bottom)
  $first = [Math]::Max(0, $last - $Lines + 1)
  $rows = for ($row = $first; $row -le $last; $row++) {
    $buffer = New-Object char[] $width
    $start = New-Object StacktapeWsl.Native+Coord
    $start.X = 0; $start.Y = [int16]$row
    $read = [uint32]0
    [void][StacktapeWsl.Native]::ReadConsoleOutputCharacterW($handle, $buffer, [uint32]$width, $start, [ref]$read)
    (-join $buffer[0..($read - 1)]).TrimEnd()
  }
} finally {
  [void][StacktapeWsl.Native]::CloseHandle($handle)
  [void][StacktapeWsl.Native]::FreeConsole()
}
($rows -join "`n").TrimEnd()
