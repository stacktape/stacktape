import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { build } from 'esbuild';

// The built-in VS Code test-host flags avoid adding a download helper to the workspace's dependencies.
// Supply a portable VS Code executable; on Linux this runner owns an automatically selected xvfb display.
const executable = process.env.STP_VSCODE_EXECUTABLE;
assert(executable, 'Set STP_VSCODE_EXECUTABLE to a portable VS Code executable. See README.md.');
const appRoot = fileURLToPath(new URL('..', import.meta.url));
const directory = await mkdtemp(join(tmpdir(), 'stacktape-j12-extension-host-'));
try {
  const project = join(directory, 'workspace');
  const home = join(directory, 'home');
  await mkdir(project);
  await mkdir(home);
  await writeFile(join(project, 'stacktape.yml'), 'resources: {}\n');
  await build({
    entryPoints: [join(appRoot, 'scripts/extension-host-suite.ts')],
    outfile: join(directory, 'suite.cjs'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['vscode'],
    target: 'node18'
  });
  const args = [
    '--disable-extensions',
    '--disable-workspace-trust',
    '--skip-welcome',
    '--skip-release-notes',
    '--disable-updates',
    '--disable-telemetry',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${join(directory, 'user-data')}`,
    `--extensions-dir=${join(directory, 'extensions')}`,
    `--extensionDevelopmentPath=${appRoot}`,
    `--extensionTestsPath=${join(directory, 'suite.cjs')}`,
    project
  ];
  const child = spawn(
    process.platform === 'linux' ? 'xvfb-run' : executable,
    process.platform === 'linux' ? ['-a', executable, ...args] : args,
    {
      detached: process.platform !== 'win32',
      env: {
        PATH: process.env.PATH,
        ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
        HOME: home,
        USERPROFILE: home,
        STP_J12_HOST_FIXTURE: project
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += String(chunk);
  });
  child.stderr.on('data', (chunk) => {
    output += String(chunk);
  });
  const terminate = () => {
    if (!child.pid) return;
    try {
      process.kill(process.platform === 'win32' ? child.pid : -child.pid, 'SIGKILL');
    } catch {
      /* Already closed. */
    }
  };
  const timeout = setTimeout(terminate, 90_000);
  try {
    const status = await new Promise<number | null>((resolve, reject) => {
      child.once('error', reject);
      child.once('close', resolve);
    });
    assert.equal(status, 0, `Extension host failed:\n${output.slice(-12_000)}`);
    for (const label of ['automatic activation', 'nearest installed schema', 'command dispatch']) {
      assert(output.includes(`PASS host ${label}`), `The suite did not complete ${label}:\n${output.slice(-12_000)}`);
    }
    console.info(
      output
        .split('\n')
        .filter((line) => line.includes('PASS host'))
        .join('\n')
    );
  } finally {
    clearTimeout(timeout);
    terminate();
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
