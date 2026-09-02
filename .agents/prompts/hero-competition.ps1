<#
.SYNOPSIS
  Runs the stacktape.com hero competition: 7 players x 4 versions -> 28 blind-numbered Astro pages.

.DESCRIPTION
  -All      launches one background pwsh process per external player (each runs its 4 versions
            sequentially so version N can be told what versions 1..N-1 already did).
  -Player X runs a single player in the foreground (used by -All; also handy for retries).
  -Only N   with -Player: re-run just version N (e.g. after a broken output).

  Numbering is pre-shuffled once into key.json so re-runs keep their numbers. Pages land in
  apps/website/src/pages/hero-competition/NN.astro; raw CLI output and logs in hero-competition-runs/.
  The "fable" player (this Claude Code session) is numbered here but written by hand, not by this script.
#>
param(
  [switch]$All,
  [string]$Player,
  [int]$Only = 0,
  [int]$Versions = 4
)

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$OutputEncoding = [Text.Encoding]::UTF8

$repo = 'C:\Projects\stacktape'
$briefPath = "$repo\.agents\prompts\hero-competition.md"
$runDir = "$repo\.agents\prompts\hero-competition-runs"
$pagesDir = "$repo\apps\website\src\pages\hero-competition"
$keyPath = "$runDir\key.json"
$players = @('codex', 'grok', 'gemini', 'deepseek', 'glm', 'opus', 'fable')
$external = $players | Where-Object { $_ -ne 'fable' }

New-Item -ItemType Directory -Force $runDir | Out-Null
New-Item -ItemType Directory -Force $pagesDir | Out-Null

# ── Blind numbering: shuffle all (player, version) pairs once; never re-shuffle an existing key. ──
if (-not (Test-Path $keyPath)) {
  $pairs = foreach ($p in $players) { foreach ($v in 1..$Versions) { [pscustomobject]@{ player = $p; version = $v } } }
  # A single seeded shuffle keeps the assignment reproducible without leaking order.
  $rng = [System.Random]::new(20260902)
  $shuffled = $pairs | Sort-Object { $rng.Next() }
  $n = 0
  $key = foreach ($pair in $shuffled) { $n++; [pscustomobject]@{ number = ('{0:00}' -f $n); player = $pair.player; version = $pair.version } }
  $key | ConvertTo-Json | Set-Content -Path $keyPath -Encoding utf8
}
$key = Get-Content $keyPath -Raw | ConvertFrom-Json

function Get-Number([string]$p, [int]$v) { ($key | Where-Object { $_.player -eq $p -and $_.version -eq $v }).number }

function Write-Utf8([string]$path, [string]$text) {
  [IO.File]::WriteAllText($path, $text, [Text.UTF8Encoding]::new($false))
}

# Pulls the Astro file out of whatever the CLI printed around it (fences, chatter, trailing notes).
function Extract-Astro([string]$text) {
  if (-not $text) { return $null }
  $t = $text -replace "`r`n", "`n"
  $t = $t -replace '(?m)^\s*```[a-zA-Z]*\s*$', ''
  # The frontmatter is the first '---' fence whose block actually imports something; models sometimes
  # print a stray '---' / '---' pair (a markdown rule) ahead of it.
  $m = [regex]::Match($t, '(?ms)^---\s*$\n(?=(?:(?!^---\s*$).)*?^\s*import\b)')
  if (-not $m.Success) { $m = [regex]::Match($t, '(?m)^---\s*$') }
  if (-not $m.Success) { return $null }
  $body = $t.Substring($m.Index)
  $ends = [regex]::Matches($body, '</(BaseLayout|style|script)>')
  if ($ends.Count -gt 0) { $last = $ends[$ends.Count - 1]; $body = $body.Substring(0, $last.Index + $last.Length) }
  if ($body -notmatch 'BaseLayout') { return $null }
  # The first brief wrongly showed CtaCommand as a default import; normalise either spelling to the named export.
  $body = $body -replace "import\s+CtaCommand\s+from\s+'([^']*components/CtaCommand)(\.tsx)?';", "import { CtaCommand } from '`$1';"
  return $body.Trim() + "`n"
}

function Get-Concepts([string]$p, [int]$upTo) {
  $lines = @()
  for ($i = 1; $i -lt $upTo; $i++) {
    $num = Get-Number $p $i
    $file = "$pagesDir\$num.astro"
    if (-not (Test-Path $file)) { continue }
    $src = Get-Content $file -Raw
    $c = [regex]::Match($src, '//\s*concept:\s*(.+)').Groups[1].Value.Trim()
    $a = [regex]::Match($src, '//\s*copy-angle:\s*(.+)').Groups[1].Value.Trim()
    if ($c -or $a) { $lines += "- version ${i}: concept: $c | copy-angle: $a" }
  }
  return $lines
}

function Build-Prompt([string]$p, [int]$v) {
  $brief = Get-Content $briefPath -Raw
  $pre = @("ORCHESTRATOR PREAMBLE", "You are producing version $v of $Versions. Each version is an independent page; the four are judged side by side.")
  $prev = Get-Concepts $p $v
  if ($prev.Count -gt 0) {
    $pre += "Concepts your previous versions already used - make this one clearly different in layout, visual idea and copy angle:"
    $pre += $prev
  }
  $pre += "Respond with ONLY the Astro file described under Deliverable: it must begin with the frontmatter line --- and contain nothing else before or after."
  return (($pre -join "`n") + "`n`n" + $brief)
}

# One CLI call. Returns the raw text the provider produced (stdout, or codex's last-message file).
function Invoke-Provider([string]$p, [string]$prompt, [string]$rawPath) {
  Set-Location $repo
  switch ($p) {
    'codex' {
      $last = "$rawPath.last.md"
      $prompt | codex exec -m gpt-5.6-sol -c 'model_reasoning_effort="max"' -s read-only --ephemeral -C $repo -o $last - 2>&1 | Out-File -FilePath "$rawPath.stdout.txt" -Encoding utf8
      if ((Test-Path $last) -and (Get-Item $last).Length -gt 0) { return (Get-Content $last -Raw) }
      return (Get-Content "$rawPath.stdout.txt" -Raw)
    }
    'opus' {
      return ($prompt | claude -p --model opus --effort max --permission-mode plan --output-format text --no-session-persistence 2>"$rawPath.stderr.txt" | Out-String)
    }
    'grok' {
      return (grok -p $prompt --model grok-4.6 --reasoning-effort xhigh --agent explore --permission-mode plan --sandbox read-only --cwd $repo --output-format plain --no-memory --no-subagents 2>"$rawPath.stderr.txt" | Out-String)
    }
    'gemini' {
      # Headless agy auto-denies any tool that would prompt (it aborted with zero output on a plain file
      # read); skipping prompts is safe here because --sandbox keeps the run read-only.
      return (agy -p $prompt --model gemini-3.7-flash-high --effort high --mode plan --sandbox --dangerously-skip-permissions --output-format text --print-timeout 40m 2>"$rawPath.stderr.txt" | Out-String)
    }
    'deepseek' {
      $env:DSH_PERMISSION_MODE = 'read-only'
      return (& dsh --profile headless --patch "$repo\.agents\prompts\external-review.dsh.yml" $prompt 2>"$rawPath.stderr.txt" | Out-String)
    }
    'glm' {
      # Claude Code 2.1.258 refuses the glm-5.3 model id before calling Z.ai (unknown-model catalog
      # check; modelOverrides and the enforcement env var do not bypass it), so GLM is called through
      # Z.ai's Anthropic-compatible Messages API directly. It therefore cannot browse the repository;
      # the design tokens it would have read are appended to its prompt instead.
      $cfg = Get-Content "$env:USERPROFILE\.glm\claude-settings.json" -Raw | ConvertFrom-Json
      $tokens = Get-Content "$repo\packages\design-tokens\generated\tokens.css" -Raw
      $full = $prompt + "`n`n## Appendix for this run`nYou have no file access in this run. Do not attempt to read files; rely on the brief. The design tokens (packages/design-tokens/generated/tokens.css) are:`n`n" + $tokens
      # GLM-5.3 "always engages in thinking" (Z.ai error 1210) and at max/high effort it spent the
      # entire 40k output budget on hidden reasoning, returning no text on every run. The Anthropic-
      # compatible endpoint ignores thinking budgets, but the OpenAI-compatible coding endpoint honours
      # `reasoning_effort` — `low` answered with zero reasoning tokens. Override with GLM_EFFORT=high.
      $effort = if ($env:GLM_EFFORT) { $env:GLM_EFFORT } else { 'low' }
      $body = @{
        model = 'glm-5.3'
        max_tokens = 40000
        thinking = @{ type = 'enabled' }
        reasoning_effort = $effort
        messages = @(
          @{ role = 'system'; content = 'You are a senior product designer and front-end engineer producing a single Astro page file. Output only the file.' },
          @{ role = 'user'; content = $full }
        )
      } | ConvertTo-Json -Depth 6
      $headers = @{ 'Authorization' = "Bearer $($cfg.env.ANTHROPIC_AUTH_TOKEN)"; 'Accept-Language' = 'en-US,en' }
      $resp = Invoke-RestMethod -Uri 'https://api.z.ai/api/coding/paas/v4/chat/completions' -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -Headers $headers -TimeoutSec 3000
      $resp | ConvertTo-Json -Depth 8 | Out-File "$rawPath.response.json" -Encoding utf8
      return ([string]$resp.choices[0].message.content)
    }
    default { throw "unknown player $p" }
  }
}

function Run-Player([string]$p) {
  $log = "$runDir\$p.log"
  $versionsToRun = if ($Only -gt 0) { @($Only) } else { 1..$Versions }
  foreach ($v in $versionsToRun) {
    $num = Get-Number $p $v
    $rawPath = "$runDir\$p-v$v"
    $stamp = Get-Date -Format 'HH:mm:ss'
    Add-Content $log "[$stamp] $p v$v -> $num.astro : starting"
    $sw = [Diagnostics.Stopwatch]::StartNew()
    try {
      $prompt = Build-Prompt $p $v
      Write-Utf8 "$rawPath.prompt.md" $prompt
      $raw = Invoke-Provider $p $prompt $rawPath
      Write-Utf8 "$rawPath.raw.txt" ([string]$raw)
      $astro = Extract-Astro ([string]$raw)
      if ($astro) {
        Write-Utf8 "$pagesDir\$num.astro" $astro
        Add-Content $log ("[{0}] {1} v{2} -> {3}.astro : OK ({4} lines, {5:n0}s)" -f (Get-Date -Format 'HH:mm:ss'), $p, $v, $num, ($astro -split "`n").Count, $sw.Elapsed.TotalSeconds)
      } else {
        Add-Content $log ("[{0}] {1} v{2} -> {3}.astro : NO ASTRO FOUND in output ({4:n0}s) - see {5}.raw.txt" -f (Get-Date -Format 'HH:mm:ss'), $p, $v, $num, $sw.Elapsed.TotalSeconds, $rawPath)
      }
    } catch {
      Add-Content $log ("[{0}] {1} v{2} -> {3}.astro : ERROR {4}" -f (Get-Date -Format 'HH:mm:ss'), $p, $v, $num, $_)
    }
  }
  Add-Content $log ("[{0}] {1} : done" -f (Get-Date -Format 'HH:mm:ss'), $p)
}

if ($All) {
  foreach ($p in $external) {
    Start-Process pwsh -ArgumentList @('-NoProfile', '-NonInteractive', '-File', $PSCommandPath, '-Player', $p, '-Versions', $Versions) -WindowStyle Hidden
    "launched $p"
  }
  "key: $keyPath"
  "logs: $runDir\<player>.log"
} elseif ($Player) {
  Run-Player $Player
} else {
  "usage: -All | -Player <codex|grok|gemini|deepseek|glm|opus> [-Only N]"
}
