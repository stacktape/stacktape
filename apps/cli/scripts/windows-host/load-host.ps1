# Loads host.cs, compiled once per source version and cached next to the scripts; a fresh compile takes about a second.
$source = Join-Path $PSScriptRoot 'host.cs'
$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $source).Hash.Substring(0, 12)
$assembly = Join-Path $PSScriptRoot "host-$hash.dll"
if (-not (Test-Path -LiteralPath $assembly)) {
  $temporary = Join-Path $PSScriptRoot "host-$hash-$PID.dll"
  Add-Type -TypeDefinition (Get-Content -Raw -LiteralPath $source) -OutputAssembly $temporary -OutputType Library
  try { Move-Item -LiteralPath $temporary -Destination $assembly -ErrorAction Stop } catch { Remove-Item -LiteralPath $temporary -ErrorAction SilentlyContinue }
}
Add-Type -LiteralPath $assembly
