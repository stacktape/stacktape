import assert from 'node:assert/strict';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCapturedProcess } from './child-process.ts';

test('captures stdout, stderr, exit status, cwd, and environment at the process boundary', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'stacktape-child-process-'));
  try {
    const result = await runCapturedProcess({
      args: [
        '-e',
        "console.log(`${process.cwd()}|${process.env.STP_PROCESS_FIXTURE}`); console.error('expected stderr'); process.exitCode = 7"
      ],
      command: process.execPath,
      cwd,
      env: { ...process.env, STP_PROCESS_FIXTURE: 'visible' }
    });

    assert.equal(result.code, 7);
    assert.equal(result.stdout.trim(), `${await realpath(cwd)}|visible`);
    assert.equal(result.stderr.trim(), 'expected stderr');
  } finally {
    await rm(cwd, { force: true, recursive: true });
  }
});

test('reports a missing executable without crashing diagnostic callers', async () => {
  const result = await runCapturedProcess({
    args: [],
    command: 'stacktape-command-that-does-not-exist',
    cwd: process.cwd()
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /ENOENT|not found/i);
});

test('can reject a missing executable for execution callers', async () => {
  await assert.rejects(
    runCapturedProcess({
      args: [],
      command: 'stacktape-command-that-does-not-exist',
      cwd: process.cwd(),
      rejectOnSpawnError: true
    }),
    /ENOENT|not found/i
  );
});
