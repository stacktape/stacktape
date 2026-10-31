# Deletes STACKTAPE_REMOVE_PATH, which must lie strictly inside C:\stacktape-wsl, without following a junction,
# symbolic link or other reparse point anywhere: a link is removed as a link. It refuses when the root itself or any
# component between the root and the target is a link, because the target would then be somewhere else.
# windows-host.ts runs this text with -EncodedCommand and passes the path as an environment variable, so the path never
# goes through cmd.exe parsing (characters such as & stay inert) and the script does not live in the folder it deletes.
$ErrorActionPreference = 'Stop'
$Root = 'C:\stacktape-wsl'
$Path = $env:STACKTAPE_REMOVE_PATH
if (-not $Path) { Write-Error 'STACKTAPE_REMOVE_PATH is required.'; exit 2 }
$pathFull = [IO.Path]::GetFullPath($Path).TrimEnd('\')
if (-not $pathFull.StartsWith($Root + '\', [StringComparison]::OrdinalIgnoreCase)) {
  Write-Error "Refusing to delete ${pathFull}: it is not inside ${Root}."
  exit 2
}
$isLink = { param($item) ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 }
$current = $Root
$parts = $pathFull.Substring($Root.Length + 1).Split('\')
for ($index = -1; $index -lt $parts.Count - 1; $index++) {
  if ($index -ge 0) { $current = Join-Path $current $parts[$index] }
  if (-not (Test-Path -LiteralPath $current)) { exit 0 }
  if (& $isLink (Get-Item -LiteralPath $current -Force)) {
    Write-Error "Refusing to delete ${pathFull}: ${current} is a link."
    exit 2
  }
}
function Remove-Entry([IO.FileSystemInfo]$item) {
  if (& $isLink $item) {
    # Directory links (junctions, symlinks) are deleted without recursing into their target.
    if ($item -is [IO.DirectoryInfo]) { [IO.Directory]::Delete($item.FullName, $false) } else { [IO.File]::Delete($item.FullName) }
    return
  }
  if ($item -is [IO.DirectoryInfo]) {
    foreach ($child in $item.EnumerateFileSystemInfos()) { Remove-Entry $child }
    $item.Attributes = [IO.FileAttributes]::Directory
    $item.Delete($false)
  } else {
    $item.Attributes = [IO.FileAttributes]::Normal
    $item.Delete()
  }
}
if (Test-Path -LiteralPath $pathFull) { Remove-Entry (Get-Item -LiteralPath $pathFull -Force) }
