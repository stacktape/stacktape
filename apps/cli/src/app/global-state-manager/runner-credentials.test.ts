import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('the CLI consumes an inherited credential descriptor and removes credentials from child environments', () => {
  const directory = mkdtempSync(join(tmpdir(), 'stacktape-credential-test-'));
  const path = join(directory, 'credential');
  writeFileSync(path, 'stp_job.synthetic.fixture\n', { mode: 0o600 });
  const descriptor = openSync(path, 'r');
  try {
    const result = spawnSync(
      process.execPath,
      [
        '--no-env-file',
        '-e',
        `
      import { consumeRunnerCredentials } from ${JSON.stringify(join(import.meta.dir, 'runner-credentials.ts'))};
      import { fstatSync } from 'node:fs';
      import { exec } from ${JSON.stringify(join(import.meta.dir, '../../utils/exec.ts'))};
      const credentials = consumeRunnerCredentials();
      if (credentials.apiKey !== 'stp_job.synthetic.fixture') throw new Error('Credential missing');
      try { fstatSync(3); throw new Error('Descriptor remained open'); } catch (error) {
        if (error.code !== 'EBADF') throw error;
      }
      const child = await exec(process.execPath, ['--no-env-file', '-e', 'process.stdout.write(JSON.stringify(Object.keys(process.env).filter(k => k.startsWith("STACKTAPE_API_KEY") || k === "STACKTAPE_GITHUB_ACTIONS_TOKEN")))'], {
        disableStdout: true, disableStderr: true,
        env: { STACKTAPE_API_KEY: 'must-not-reintroduce-a-key' }
      });
      if (child.stdout !== '[]') throw new Error('Credential environment names reached the child: ' + child.stdout);
      process.stdout.write('credential consumed and child clean');
    `
      ],
      {
        env: {
          ...process.env,
          STACKTAPE_API_KEY: 'ignored-synthetic-value',
          STACKTAPE_API_KEY_FD: '3',
          STACKTAPE_GITHUB_ACTIONS_TOKEN: 'ignored-job-token'
        },
        stdio: ['ignore', 'pipe', 'pipe', descriptor],
        encoding: 'utf8'
      }
    );
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('credential consumed and child clean');
  } finally {
    closeSync(descriptor);
    rmSync(directory, { recursive: true, force: true });
  }
});

test('an invalid runner descriptor fails closed instead of falling back to a persisted credential', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--no-env-file',
      '-e',
      `
    import { consumeRunnerCredentials } from ${JSON.stringify(join(import.meta.dir, 'runner-credentials.ts'))};
    consumeRunnerCredentials();
  `
    ],
    { env: { ...process.env, STACKTAPE_API_KEY_FD: '0' }, encoding: 'utf8' }
  );
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Invalid runner credential descriptor');
});
