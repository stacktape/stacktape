import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import stripAnsi from 'strip-ansi';

// `stacktape mcp:add` and `mcp:remove` from the compiled binary, in an empty home directory. Proves the binary writes
// agent configs without losing the user's own content, and that the server it configures answers
// a 2025-era MCP handshake with every tool.
const run = ({ binaryPath, home, args }: { binaryPath: string; home: string; args: string[] }) => {
  const result = Bun.spawnSync({
    cmd: [binaryPath, ...args],
    cwd: home,
    env: {
      // No `stacktape` and no coding-agent CLIs on PATH: the setup must write the binary's own absolute path.
      PATH: join(home, 'no-tools'),
      SystemRoot: process.env.SystemRoot,
      HOME: home,
      USERPROFILE: home,
      STP_DISABLE_TELEMETRY: '1'
    },
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 90_000
  });
  return { exitCode: result.exitCode, output: stripAnsi(`${result.stdout.toString()}${result.stderr.toString()}`) };
};

const assert = (condition: unknown, message: string, output?: string) => {
  if (!condition) throw new Error(`${message}${output ? `\n${output}` : ''}`);
};

export const verifyMcpAgentSetup = async ({ binaryPath, home }: { binaryPath: string; home: string }) => {
  const cursorConfig = join(home, '.cursor', 'mcp.json');
  const opencodeConfig = join(home, '.config', 'opencode', 'opencode.jsonc');

  const nothingFound = run({ binaryPath, home, args: ['mcp:add', '--agent'] });
  assert(nothingFound.exitCode !== 0, '`mcp:add --agent` with no agents installed should fail.', nothingFound.output);
  assert(!existsSync(cursorConfig), '`mcp:add` wrote files although no agent was found.');

  await mkdir(join(home, '.cursor'), { recursive: true });
  await writeFile(cursorConfig, '{\n  // mine\n  "mcpServers": {\n    "github": { "command": "gh" }\n  }\n}\n');
  await mkdir(join(home, '.config', 'opencode'), { recursive: true });
  await writeFile(opencodeConfig, '{\n  // opencode settings\n  "theme": "dark"\n}\n');

  const added = run({ binaryPath, home, args: ['mcp:add', '--agent'] });
  assert(added.exitCode === 0, '`mcp:add --agent` failed.', added.output);
  assert(added.output.includes('offers 5 Stacktape tools'), '`mcp:add` did not report a working server.', added.output);

  const cursor = await readFile(cursorConfig, 'utf-8');
  assert(
    cursor.includes('// mine') && cursor.includes('"github": { "command": "gh" }'),
    'Cursor config lost content.',
    cursor
  );
  assert(cursor.includes(JSON.stringify(binaryPath)), 'Cursor config does not run the binary by its path.', cursor);
  const opencode = await readFile(opencodeConfig, 'utf-8');
  assert(
    opencode.includes('// opencode settings') && opencode.includes('"theme": "dark"'),
    'OpenCode lost content.',
    opencode
  );
  assert(opencode.includes('"type": "local"'), 'OpenCode config has no Stacktape entry.', opencode);

  const repeated = run({ binaryPath, home, args: ['mcp:add', '--agent'] });
  assert(
    repeated.exitCode === 0 && repeated.output.includes('already set up'),
    'A repeated `mcp:add` changed files.',
    repeated.output
  );

  const removed = run({ binaryPath, home, args: ['mcp:remove', '--agent'] });
  assert(removed.exitCode === 0, '`mcp:remove --agent` failed.', removed.output);
  assert(!(await readFile(cursorConfig, 'utf-8')).includes('stacktape'), '`mcp:remove` left the Cursor entry.');
  assert((await readFile(cursorConfig, 'utf-8')).includes('// mine'), '`mcp:remove` lost Cursor content.');
  assert(!(await readFile(opencodeConfig, 'utf-8')).includes('stacktape'), '`mcp:remove` left the OpenCode entry.');
};
