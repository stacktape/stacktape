# Deletes STACKTAPE_REMOVE_PATH, which must lie strictly inside STACKTAPE_REMOVE_ROOT, without following junctions or
# symbolic links: a link is removed as a link. windows-host.ts runs this text with -EncodedCommand and passes both
# paths as environment variables, so no path goes through cmd.exe parsing (characters such as & stay inert) and the
# script does not live in the folder it deletes.
$ErrorActionPreference = 'Stop'
$Root = $env:STACKTAPE_REMOVE_ROOT
$Path = $env:STACKTAPE_REMOVE_PATH
if (-not $Root -or -not $Path) { Write-Error 'STACKTAPE_REMOVE_ROOT and STACKTAPE_REMOVE_PATH are required.'; exit 2 }
$rootFull = [IO.Path]::GetFullPath($Root).TrimEnd('\')
$pathFull = [IO.Path]::GetFullPath($Path).TrimEnd('\')
if (-not $pathFull.StartsWith($rootFull + '\', [StringComparison]::OrdinalIgnoreCase)) {
  Write-Error "Refusing to delete ${pathFull}: it is not inside ${rootFull}."
  exit 2
}
# No component between the root and the target may be a link, or the target would be somewhere else.
$current = $rootFull
foreach ($part in $pathFull.Substring($rootFull.Length + 1).Split('\')) {
  if ((Test-Path -LiteralPath $current) -and ((Get-Item -LiteralPath $current -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    Write-Error "Refusing to delete below ${current}: it is a link."
    exit 2
  }
  $current = Join-Path $current $part
}
function Remove-Entry([IO.FileSystemInfo]$item) {
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
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
