import { mkdtemp, readFile, remove, writeFile } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const workspaceRoot = join(import.meta.dir, '..', '..', '..');
const claudeCliPath = process.env.CLAUDE_CLI_PATH || Bun.which('claude') || 'claude';
const codexCliPath = process.env.CODEX_CLI_PATH || Bun.which('codex') || 'codex';

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
    throw new Error(`Command failed (${cmd.join(' ')}):\n${stderr || stdout}`);
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

export const callClaudeJson = async <T,>({ prompt, jsonSchema }: { prompt: string; jsonSchema: Record<string, unknown> }) => {
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
    return parsed.structured_output;
  }
  if ('result' in parsed && typeof parsed.result === 'string') {
    return parseJson<T>(parsed.result);
  }
  return parsed as T;
};

export const callCodexJson = async <T,>({ prompt, jsonSchema }: { prompt: string; jsonSchema: Record<string, unknown> }) => {
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
    return parseJson<T>(output);
  } finally {
    await remove(tempDir);
  }
};
