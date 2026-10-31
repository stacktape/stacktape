// The helper's safety guarantees, checked on the real Windows host through the helper itself. It needs WSL with
// Windows interop and PowerShell 7, and runs only with STACKTAPE_WINDOWS_HOST_E2E=1:
//   STACKTAPE_WINDOWS_HOST_E2E=1 AWS_PROFILE=stacktape-e2e pnpm --filter @stacktape/cli run test:windows-host:e2e
// Every fixture lives in C:\stacktape-wsl\<run id>-* and is deleted afterwards. Nothing opens a window and nothing
// contacts AWS.
import { afterAll, describe, expect, setDefaultTimeout, test } from 'bun:test';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const enabled = process.env.STACKTAPE_WINDOWS_HOST_E2E === '1';
setDefaultTimeout(240_000);
const run = `whe2e-${Date.now().toString(36)}`;
const task = `${run}-task`;
const outside = `${run}-outside`;
const ROOT_WSL = '/mnt/c/stacktape-wsl';
const HELPER = join(import.meta.dir, 'windows-host.ts');

const helper = (...args: string[]): SpawnSyncReturns<string> =>
  spawnSync('bun', [HELPER, ...args], {
    cwd: join(import.meta.dir, '..', '..'),
    encoding: 'utf8',
    env: { ...process.env, AWS_PROFILE: 'stacktape-e2e' },
    timeout: 120_000
  });

/** Creates a directory junction with cmd's mklink, run through the helper so it is inside a task folder. */
const junction = (link: string, target: string) => {
  const result = helper('exec', '--task', outside, '--control-plane', 'user', '--', 'mklink', '/J', link, target);
  expect(result.status).toBe(0);
};

const keep = () => join(ROOT_WSL, outside, 'keep.txt');

describe.skipIf(!enabled)('windows-host on the Windows host', () => {
  afterAll(() => {
    for (const id of [task, outside]) helper('cleanup', '--task', id);
    expect(existsSync(join(ROOT_WSL, task))).toBe(false);
    expect(existsSync(join(ROOT_WSL, outside))).toBe(false);
  });

  test('setup: a folder outside the task with a file that must survive', () => {
    mkdirSync(join(ROOT_WSL, outside), { recursive: true });
    writeFileSync(keep(), 'keep');
    expect(helper('exec', '--task', task, '--control-plane', 'user', '--', 'ver').status).toBe(0);
  });

  test('a junction inside a deleted folder is removed as a link, not followed', () => {
    const app = join(ROOT_WSL, task, 'projects', 'app');
    mkdirSync(app, { recursive: true });
    junction(`C:\\stacktape-wsl\\${task}\\projects\\app\\outside`, `C:\\stacktape-wsl\\${outside}`);
    expect(readdirSync(join(app, 'outside'))).toContain('keep.txt');
    const source = join(import.meta.dir, '__fixture-app');
    mkdirSync(source, { recursive: true });
    writeFileSync(join(source, 'stacktape.yml'), 'resources: {}\n');
    try {
      const staged = helper('stage', source, '--task', task, '--name', 'app');
      expect(staged.status).toBe(0);
    } finally {
      spawnSync('rm', ['-rf', source]);
    }
    expect(readdirSync(app)).toEqual(['stacktape.yml']);
    expect(existsSync(keep())).toBe(true);
  });

  test('a link above the target makes deletion and writing refuse', () => {
    // <task>\projects becomes a junction to the outside folder; staging into it must not delete or write there.
    // A plain folder now: staging removed the junction inside it.
    rmSync(join(ROOT_WSL, task, 'projects'), { recursive: true });
    junction(`C:\\stacktape-wsl\\${task}\\projects`, `C:\\stacktape-wsl\\${outside}`);
    mkdirSync(join(ROOT_WSL, outside, 'app'), { recursive: true });
    writeFileSync(join(ROOT_WSL, outside, 'app', 'precious.txt'), 'precious');
    const source = join(import.meta.dir, '__fixture-app');
    mkdirSync(source, { recursive: true });
    writeFileSync(join(source, 'stacktape.yml'), 'resources: {}\n');
    try {
      const staged = helper('stage', source, '--task', task, '--name', 'app');
      expect(staged.status).not.toBe(0);
      expect(staged.stderr).toContain('is a link');
    } finally {
      spawnSync('rm', ['-rf', source]);
    }
    expect(existsSync(join(ROOT_WSL, outside, 'app', 'precious.txt'))).toBe(true);
    expect(existsSync(keep())).toBe(true);
    // The helper refuses to write its own files below a link too.
    rmSync(join(ROOT_WSL, task, 'logs'), { recursive: true });
    junction(`C:\\stacktape-wsl\\${task}\\logs`, `C:\\stacktape-wsl\\${outside}`);
    const console = helper('console', '--task', task, '--detach', '--program', 'C:\\Windows\\System32\\cmd.exe');
    expect(console.status).not.toBe(0);
    expect(console.stderr).toContain('is a link');
    for (const written of ['console.json', 'console-output.log', 'processes.jsonl']) {
      expect(existsSync(join(ROOT_WSL, outside, written))).toBe(false);
    }
    expect(existsSync(join(ROOT_WSL, outside, 'logs', 'console.json'))).toBe(false);
  });

  test('a task folder that is a link is refused, and cleanup removes only the link', () => {
    const linked = `${run}-linked`;
    junction(`C:\\stacktape-wsl\\${linked}`, `C:\\stacktape-wsl\\${outside}`);
    const listed = helper('ps', '--task', linked);
    expect(listed.status).not.toBe(0);
    expect(listed.stderr).toContain('is a link');
    expect(helper('cleanup', '--task', linked).status).toBe(0);
    expect(existsSync(join(ROOT_WSL, linked))).toBe(false);
    expect(existsSync(keep())).toBe(true);
  });

  test('the job holds what the task started, also after the starting process exited', async () => {
    // Reset the task folder: the previous tests replaced its projects and logs with links.
    expect(helper('cleanup', '--task', task).status).toBe(0);
    // cmd starts ping in the background and exits at once; ping is still the task's. WSL keeps this helper call open
    // while ping shares its hidden console, so it runs in the background and must end once the job is killed.
    // A short program first: its keeper is exiting while the next program starts, which must not lose the job.
    expect(helper('exec', '--task', task, '--control-plane', 'user', '--', 'ver').status).toBe(0);
    const started = Bun.spawn(
      [
        'bun',
        HELPER,
        'exec',
        '--task',
        task,
        '--control-plane',
        'user',
        '--',
        'start',
        '/b',
        'ping',
        '-n',
        '600',
        '127.0.0.1'
      ],
      {
        cwd: join(import.meta.dir, '..', '..'),
        env: { ...process.env, AWS_PROFILE: 'stacktape-e2e' },
        stdout: 'ignore',
        stderr: 'ignore'
      }
    );
    // An unrelated process that mentions the task folder, started outside the helper.
    const unrelated = Bun.spawn(
      [
        '/mnt/c/Program Files/PowerShell/7/pwsh.exe',
        '-NoProfile',
        '-Command',
        `Get-ChildItem C:\\stacktape-wsl\\${task} | Out-Null; Start-Sleep 60`
      ],
      { cwd: '/mnt/c', stdout: 'ignore', stderr: 'ignore' }
    );
    try {
      Bun.sleepSync(5000);
      const listed = helper('ps', '--task', task);
      expect(listed.stdout).toContain('PING.EXE');
      expect(listed.stdout).not.toContain('cmd.exe');
      expect(listed.stdout).not.toContain('pwsh.exe');
      expect(helper('kill', '--task', task).status).toBe(0);
      expect(helper('ps', '--task', task).stdout).not.toContain('PING.EXE');
      expect(await Promise.race([started.exited, Bun.sleep(30_000).then(() => 'still running')])).not.toBe(
        'still running'
      );
      expect(unrelated.exitCode).toBeNull();
    } finally {
      unrelated.kill();
      started.kill();
    }
  });

  test('keys reach the pseudo console through its pipe; no input files exist', () => {
    const started = helper(
      'console',
      '--task',
      task,
      '--detach',
      '--control-plane',
      'user',
      '--program',
      'C:\\Windows\\System32\\cmd.exe',
      '--',
      '/q'
    );
    expect(started.status).toBe(0);
    Bun.sleepSync(1500);
    expect(helper('keys', '--task', task, '--', 'echo typed-through-the-pipe', 'enter').status).toBe(0);
    Bun.sleepSync(1500);
    expect(helper('screen', '--task', task).stdout).toContain('typed-through-the-pipe');
    expect(readdirSync(join(ROOT_WSL, task, 'logs')).some((name) => name.includes('input'))).toBe(false);
    expect(helper('keys', '--task', task, '--', 'exit', 'enter').status).toBe(0);
    const waited = helper('wait', '--task', task, '--timeout', '30');
    expect(waited.status).toBe(0);
  });
});
