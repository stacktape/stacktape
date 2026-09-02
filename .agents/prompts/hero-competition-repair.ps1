<#
.SYNOPSIS
  Mechanical repairs for competition pages that models get wrong in predictable ways.

  1. Curly braces inside <pre>…</pre> blocks are escaped (&#123; / &#125;) — in Astro markup a bare
     brace opens an expression, so every code sample with braces is a compile error.
  2. The CtaCommand default import is rewritten to the named export.

  Idempotent; safe to run on every page. Usage: hero-competition-repair.ps1 [-Only 02,25]
#>
param([string[]]$Only)

$pagesDir = 'C:\Projects\stacktape\apps\website\src\pages\hero-competition'
$files = Get-ChildItem "$pagesDir\[0-9][0-9].astro"
if ($Only) { $files = $files | Where-Object { $Only -contains $_.BaseName } }

foreach ($f in $files) {
  $src = [IO.File]::ReadAllText($f.FullName)
  $out = $src

  # 0. A stray empty '---' / '---' pair printed ahead of the real frontmatter (a markdown rule).
  $out = [regex]::Replace($out, '\A---\r?\n\s*\r?\n---\r?\n(?=//|import)', "---`n")

  # Only the markup half of the file: everything after the closing frontmatter fence and before <style>/<script>.
  $fm = [regex]::Match($out, '(?s)\A---.*?\n---\n')
  $head = if ($fm.Success) { $out.Substring(0, $fm.Length) } else { '' }
  $rest = if ($fm.Success) { $out.Substring($fm.Length) } else { $out }

  $rest = [regex]::Replace($rest, '(?s)<pre\b[^>]*>.*?</pre>', {
    param($m)
    $block = $m.Value
    # Leave already-escaped entities and genuine Astro expressions like {' '} alone.
    $block = $block -replace "\{' '\}", '&#32;'
    $block = $block -replace '(?<!&#12)\{', '&#123;'
    $block = $block -replace '\}', '&#125;'
    return $block
  })

  $out = $head + $rest
  $out = $out -replace "import\s+CtaCommand\s+from\s+'([^']*components/CtaCommand)(\.tsx)?';", "import { CtaCommand } from '`$1';"

  if ($out -ne $src) {
    [IO.File]::WriteAllText($f.FullName, $out, [Text.UTF8Encoding]::new($false))
    "repaired $($f.Name)"
  } else {
    "unchanged $($f.Name)"
  }
}
