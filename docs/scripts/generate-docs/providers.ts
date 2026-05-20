import { mkdtemp, readFile, remove, writeFile } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const workspaceRoot = join(import.meta.dir, '..', '..', '..');

// Resolve a CLI binary by name. Prefer the explicit env var, then ask the OS (`where.exe` on
// Windows, `which` elsewhere) for *all* matches on the user's actual PATH and return the first
// one that isn't under `node_modules`. We deliberately avoid `Bun.which` and `Bun.spawn`'s
// bare-name resolution: inside a `bun run` script those both prepend `node_modules/.bin` to
// PATH and end up picking broken local shims (e.g. a `claude.exe` shim whose target package
// isn't installed locally).
const findCliBinary = (binName: string): string | null => {
  const isWindows = process.platform === 'win32';
  const cmd = isWindows ? ['where.exe', binName] : ['which', '-a', binName];
  try {
    // Local Bun type stubs don't expose spawnSync; cast to any for the sync resolver use case.
    const proc = (Bun as any).spawnSync({ cmd, stdout: 'pipe', stderr: 'pipe' });
    if (proc.exitCode !== 0) return null;
    const lines = new TextDecoder()
      .decode(proc.stdout as Uint8Array)
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter(Boolean);
    const nonNodeModules = lines.find((line) => !line.toLowerCase().includes('node_modules'));
    return nonNodeModules || lines[0] || null;
  } catch {
    return null;
  }
};

const resolveCli = (binName: string, envVarName: string): string => {
  const fromEnv = process.env[envVarName];
  if (fromEnv) return fromEnv;
  return findCliBinary(binName) || binName;
};

const claudeCliPath = resolveCli('claude', 'CLAUDE_CLI_PATH');
const codexCliPath = resolveCli('codex', 'CODEX_CLI_PATH');

// Wall-clock cap per CLI call. If Claude/Codex hangs (network stall, server-side rate-limit
// with no client response, etc.), the pipeline used to wait forever. 25 minutes covers long
// writer calls on Opus during low-bandwidth windows. When a call genuinely hangs, the auto-
// pause-and-retry logic in runCommand treats the timeout like a rate-limit signal and retries
// after a backoff — so an overshot is recoverable rather than fatal.
const DEFAULT_RUN_TIMEOUT_MS = 25 * 60_000;

// Patterns that mean "Anthropic/Codex usage limit hit OR transient API failure — wait and retry".
// We treat 5xx-class errors and generic API errors as retryable too: they often resolve in a
// minute or two, and crashing the whole batch over a single transient blip wastes hours.
const RATE_LIMIT_PATTERNS: RegExp[] = [
  /you'?ve hit your limit/i,
  /you have hit your limit/i,
  /hit your limit\s*[·:-]\s*resets/i,
  /\busage limit\b/i,
  /\brate[\s_-]?limit/i,
  /\bquota\b/i,
  /\btoo many requests\b/i,
  /\b429\b/,
  /upgrade to pro/i,
  /purchase more credits/i,
  /try again later/i,
  /reached your/i,
  /resets (?:at )?\d{1,2}:\d{2}\s*(?:am|pm)?/i,
  /resets in \d+/i,
  // Transient Anthropic API errors: "API Error: ...Internal server error", "overloaded_error",
  // "server_error", 5xx envelopes. Worth retrying — they typically clear within a minute or two.
  /api error[: ]/i,
  /internal server error/i,
  /overloaded_error/i,
  /\bserver_error\b/i,
  /\bservice unavailable\b/i,
  /\b50[0-9]\s+(?:error|server|gateway|service)/i,
  /\bbad gateway\b/i,
  /\bgateway timeout\b/i,
  /upstream (?:error|connect|timeout)/i
];

// Hard ceiling on how long we'll sleep waiting for a rate-limit to reset. 8h covers same-day
// 6-hour-window resets and most weekly-window resets that fire overnight. Beyond that, give up
// and surface the error to the caller — better to fail visibly than spin for days.
const MAX_RATE_LIMIT_SLEEP_MS = 8 * 60 * 60_000;
// Backoff schedule for rate-limit retries when we can't parse a reset time from the response.
// 5min → 30min → 2h. After three retries we surface the error.
const FALLBACK_BACKOFF_MS = [5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];

const isRateLimitText = (text: string) => RATE_LIMIT_PATTERNS.some((re) => re.test(text));

// Parse a reset wall-clock time from an Anthropic rate-limit error message.
// Examples it handles: "resets 11:50am (Europe/Bratislava)", "resets at 5pm", "resets 17:30".
// Returns the Date the rate limit is expected to clear, or null if no time is parseable.
const parseRateLimitResetTime = (text: string, timezone?: string): Date | null => {
  const match = text.match(/resets(?:\s+at)?\s+(\d{1,2}):(\d{2})\s*(am|pm)?(?:\s*\(([^)]+)\))?/i);
  if (!match) return null;
  let hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  const ampm = (match[3] || '').toLowerCase();
  const parsedZone = match[4] || timezone;
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (ampm === 'pm' && hour < 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;
  // Reset time is local-clock-in-claimed-zone. Without proper zone parsing, treat as system
  // local time and assume the user's account window is also in their local zone. If the parsed
  // time is in the past, assume tomorrow.
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  if (target.getTime() <= now.getTime() + 60_000) {
    target.setDate(target.getDate() + 1);
  }
  // If a zone was specified and differs from system zone, that's fine — we slightly over- or
  // under-shoot the reset. Worst case: we wake a bit early and hit the limit again, which will
  // re-trigger the same backoff loop.
  if (parsedZone) {
    void parsedZone;
  }
  return target;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// How long to wait, given the rate-limit text and the attempt count.
// Tries to honor the reset time first; falls back to a fixed schedule when no time is parseable.
const computeRateLimitSleep = ({ text, attempt }: { text: string; attempt: number }): { sleepMs: number; resetAt?: Date } => {
  const resetAt = parseRateLimitResetTime(text);
  if (resetAt) {
    const sleepMs = Math.min(Math.max(resetAt.getTime() - Date.now() + 30_000, 60_000), MAX_RATE_LIMIT_SLEEP_MS);
    return { sleepMs, resetAt };
  }
  const idx = Math.min(attempt - 1, FALLBACK_BACKOFF_MS.length - 1);
  return { sleepMs: FALLBACK_BACKOFF_MS[Math.max(0, idx)] };
};

type CliError = { rateLimit: boolean; rateLimitText?: string; underlyingMessage: string };

const runCommandOnce = async ({
  cmd,
  cwd,
  stdinText,
  timeoutMs = DEFAULT_RUN_TIMEOUT_MS
}: {
  cmd: string[];
  cwd: string;
  stdinText?: string;
  timeoutMs?: number;
}): Promise<{ stdout: string; error?: CliError }> => {
  const subprocess = Bun.spawn({
    cmd,
    cwd,
    stdin: stdinText ? new Blob([stdinText]) : 'ignore',
    stdout: 'pipe',
    stderr: 'pipe'
  });

  let timedOut = false;
  const timeoutHandle = setTimeout(() => {
    timedOut = true;
    try {
      (subprocess as { kill?: () => void }).kill?.();
    } catch {
      // Already exited.
    }
  }, timeoutMs);

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(subprocess.stdout).text(),
    new Response(subprocess.stderr).text(),
    subprocess.exited
  ]);
  clearTimeout(timeoutHandle);

  if (timedOut) {
    const printableCommand = cmd.slice(0, 2).join(' ');
    // Treat CLI timeouts as rate-limit-equivalent: when Claude/Codex hangs past our wall-clock
    // cap, it's almost always because the server is silently queueing the request behind a
    // throttled tenant. Retry with backoff rather than crashing the page run.
    return {
      stdout,
      error: {
        rateLimit: true,
        rateLimitText: `CLI timeout after ${Math.round(timeoutMs / 1000)}s — likely silent server-side throttling`,
        underlyingMessage: `CLI timeout after ${Math.round(timeoutMs / 1000)}s — killed subprocess. (${printableCommand})`
      }
    };
  }

  // Claude CLI sometimes exits 0 but embeds a rate-limit error in the JSON envelope:
  //   {"type":"result","subtype":"success","is_error":true,"result":"You've hit your limit · resets 11:50am (...)"}
  // Detect that even on a "successful" exit.
  let embeddedRateLimitText: string | undefined;
  if (exitCode === 0) {
    try {
      const parsed = JSON.parse(stdout) as { is_error?: boolean; result?: string };
      if (parsed.is_error && typeof parsed.result === 'string' && isRateLimitText(parsed.result)) {
        embeddedRateLimitText = parsed.result;
      }
    } catch {
      // stdout isn't JSON — fine, no embedded error.
    }
  }

  if (exitCode !== 0 || embeddedRateLimitText) {
    const printableCommand = cmd.map((part) => (part.length > 200 ? `${part.slice(0, 200)}...` : part)).join(' ');
    const combined = `${stderr}\n${stdout}\n${embeddedRateLimitText || ''}`;
    const isRateLimit = isRateLimitText(combined);
    return {
      stdout,
      error: {
        rateLimit: isRateLimit,
        rateLimitText: isRateLimit ? (embeddedRateLimitText || stdout || stderr).slice(0, 500) : undefined,
        underlyingMessage: `Command failed (${printableCommand}):\n${stderr || stdout}`
      }
    };
  }

  return { stdout };
};

// Public runCommand wrapper that auto-pauses-and-resumes on Anthropic/Codex rate-limit signals.
// When the CLI reports "you've hit your limit · resets HH:MM" (or similar), we parse the reset
// time, sleep until then, and retry the same call. This makes the entire pipeline rate-limit
// resilient with no extra plumbing at call sites.
const runCommand = async (args: {
  cmd: string[];
  cwd: string;
  stdinText?: string;
  timeoutMs?: number;
}): Promise<string> => {
  const maxAttempts = 4; // initial + 3 retries on rate-limit
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { stdout, error } = await runCommandOnce(args);
    if (!error) return stdout;
    if (!error.rateLimit || attempt === maxAttempts) {
      throw new Error(error.underlyingMessage);
    }
    const { sleepMs, resetAt } = computeRateLimitSleep({ text: error.rateLimitText || '', attempt });
    const cliBin = args.cmd[0]?.split(/[\\/]/).pop() || 'cli';
    const resetLabel = resetAt ? ` (resumes at ${resetAt.toLocaleTimeString()})` : '';
    console.warn(
      `  ${cliBin}: rate-limit detected on attempt ${attempt}/${maxAttempts}; sleeping ${Math.round(sleepMs / 60_000)}min${resetLabel}.`
    );
    if (error.rateLimitText) {
      console.warn(`    "${error.rateLimitText.slice(0, 180)}"`);
    }
    await sleep(sleepMs);
  }
  // Unreachable — the loop above either returns or throws.
  throw new Error('runCommand exhausted retries unexpectedly.');
};

const parseJson = <T,>(raw: string): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const fencedJsonMatch = raw.match(/```json\s*([\s\S]*?)```/i);
    if (fencedJsonMatch) {
      console.warn('JSON response was wrapped in markdown fences — extracted and re-parsed.');
      return JSON.parse(fencedJsonMatch[1]) as T;
    }
    throw new Error(`Failed to parse JSON response:\n${raw.slice(0, 1200)}`);
  }
};

export const callClaudeText = async ({ prompt }: { prompt: string }) => {
  const stdout = await runCommand({
    cmd: [claudeCliPath, '-p', '--output-format', 'text', '--dangerously-skip-permissions', '--add-dir', workspaceRoot],
    cwd: workspaceRoot,
    stdinText: prompt
  });
  return stdout.trim();
};

export const callClaudeJson = async <T,>({
  prompt,
  jsonSchema,
  model
}: {
  prompt: string;
  jsonSchema: Record<string, unknown>;
  // Optional model override. When omitted, the Claude CLI uses its default (Opus). Pass
  // 'claude-sonnet-4-6' for faster, cheaper review-style calls.
  model?: string;
}): Promise<T> => {
  const stdout = await runCommand({
    cmd: [
      claudeCliPath,
      '-p',
      '--output-format',
      'json',
      '--dangerously-skip-permissions',
      '--add-dir',
      workspaceRoot,
      ...(model ? ['--model', model] : []),
      '--json-schema',
      JSON.stringify(jsonSchema)
    ],
    cwd: workspaceRoot,
    stdinText: prompt
  });
  const parsed = JSON.parse(stdout) as { result?: string; structured_output?: T } | Record<string, unknown>;
  if ('structured_output' in parsed && parsed.structured_output) {
    return parsed.structured_output as T;
  }
  if ('result' in parsed && typeof parsed.result === 'string') {
    return parseJson<T>(parsed.result);
  }
  return parsed as T;
};

export const callCodexJson = async <T,>({
  prompt,
  jsonSchema,
  model
}: {
  prompt: string;
  jsonSchema: Record<string, unknown>;
  model?: string;
}): Promise<T> => {
  const tempDir = await mkdtemp(join(tmpdir(), 'stacktape-docs-codex-'));
  const schemaPath = join(tempDir, 'schema.json');
  const outputPath = join(tempDir, 'output.txt');
  await writeFile(schemaPath, JSON.stringify(jsonSchema, null, 2));

  try {
    await runCommand({
      cmd: [
        codexCliPath,
        'exec',
        '-',
        ...(model ? ['--model', model] : []),
        '--skip-git-repo-check',
        '--sandbox',
        'read-only',
        '--output-schema',
        schemaPath,
        '--output-last-message',
        outputPath,
        '-C',
        workspaceRoot
      ],
      cwd: workspaceRoot,
      stdinText: prompt
    });

    const output = await readFile(outputPath, 'utf8');
    if (!output.trim()) {
      // Codex sometimes exits 0 but writes nothing — typically a model-version mismatch or
      // an MCP startup failure. Surface this as a recognizable error so the caller can fall
      // back to Claude.
      throw new Error('Codex unavailable: empty output (likely model/version mismatch).');
    }
    return parseJson<T>(output);
  } finally {
    await remove(tempDir);
  }
};
