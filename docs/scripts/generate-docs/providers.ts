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

const runCommand = async ({
  cmd,
  cwd,
  stdinText
}: {
  cmd: string[];
  cwd: string;
  stdinText?: string;
}) => {
  const subprocess = Bun.spawn({
    cmd,
    cwd,
    stdin: stdinText ? new Blob([stdinText]) : 'ignore',
    stdout: 'pipe',
    stderr: 'pipe'
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(subprocess.stdout).text(),
    new Response(subprocess.stderr).text(),
    subprocess.exited
  ]);

  if (exitCode !== 0) {
    const printableCommand = cmd.map((part) => (part.length > 200 ? `${part.slice(0, 200)}...` : part)).join(' ');
    throw new Error(`Command failed (${printableCommand}):\n${stderr || stdout}`);
  }

  return stdout;
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

export const callClaudeJson = async <T,>({ prompt, jsonSchema }: { prompt: string; jsonSchema: Record<string, unknown> }): Promise<T> => {
  const stdout = await runCommand({
    cmd: [
      claudeCliPath,
      '-p',
      '--output-format',
      'json',
      '--dangerously-skip-permissions',
      '--add-dir',
      workspaceRoot,
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

export const callCodexJson = async <T,>({ prompt, jsonSchema }: { prompt: string; jsonSchema: Record<string, unknown> }): Promise<T> => {
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
