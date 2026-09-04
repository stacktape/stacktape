import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./verify-console-pointer.ts', import.meta.url));

const run = (command: string, args: readonly string[], cwd: string) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};

test('accepts pushed Console commits and rejects commits that exist only in a disposable checkout', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'stacktape-console-pointer-'));
  const remote = path.join(fixture, 'console.git');
  const repository = path.join(fixture, 'public');
  const consoleRoot = path.join(repository, 'apps', 'console');

  try {
    await mkdir(path.dirname(consoleRoot), { recursive: true });
    run('git', ['init', '--bare', '--initial-branch=main', remote], fixture);
    run('git', ['clone', remote, consoleRoot], fixture);
    run('git', ['config', 'user.name', 'Stacktape Test'], consoleRoot);
    run('git', ['config', 'user.email', 'test@stacktape.invalid'], consoleRoot);

    await writeFile(path.join(consoleRoot, 'package.json'), '{"private":true}\n');
    run('git', ['add', 'package.json'], consoleRoot);
    run('git', ['commit', '-m', 'initial'], consoleRoot);
    run('git', ['push', '-u', 'origin', 'main'], consoleRoot);

    const pushed = spawnSync(process.execPath, [script, repository], { encoding: 'utf8' });
    assert.equal(pushed.status, 0, pushed.stderr);
    assert.match(pushed.stdout, /is recoverable from: origin\/main/);

    run('git', ['config', 'remote.origin.fetch', '+refs/heads/main:refs/remotes/origin/main'], consoleRoot);
    run('git', ['switch', '-c', 'codex/private-change'], consoleRoot);
    await writeFile(path.join(consoleRoot, 'feature.txt'), 'pushed feature\n');
    run('git', ['add', 'feature.txt'], consoleRoot);
    run('git', ['commit', '-m', 'feature'], consoleRoot);
    run('git', ['push', 'origin', 'codex/private-change'], consoleRoot);
    const feature = spawnSync(process.execPath, [script, repository], { encoding: 'utf8' });
    assert.equal(feature.status, 0, feature.stderr);
    assert.match(feature.stdout, /is recoverable from: origin\/codex\/private-change/);

    await writeFile(path.join(consoleRoot, 'private-change.txt'), 'not pushed\n');
    run('git', ['add', 'private-change.txt'], consoleRoot);
    run('git', ['commit', '-m', 'local only'], consoleRoot);

    const localOnly = spawnSync(process.execPath, [script, repository], { encoding: 'utf8' });
    assert.equal(localOnly.status, 1);
    assert.match(localOnly.stderr, /is not reachable from a remote branch/);
  } finally {
    await rm(fixture, { force: true, recursive: true });
  }
});
