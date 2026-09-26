import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDockerGuard } from './docker-guard';

// A `docker` later on PATH than the guard, standing in for the real CLI: it records every call. The guard must never
// reach it, and no test here reaches a daemon.
let root: string;
let laterDockerDirectory: string;
let laterDockerCalls: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stacktape-docker-guard-'));
  laterDockerDirectory = join(root, 'later-on-path');
  laterDockerCalls = join(root, 'later-docker-calls.log');
  await mkdir(laterDockerDirectory);
  await writeFile(
    join(laterDockerDirectory, 'docker'),
    `#!/bin/sh\nprintf '%s\\n' "$*" >> '${laterDockerCalls}'\necho 'real docker output'\n`
  );
  await chmod(join(laterDockerDirectory, 'docker'), 0o755);
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

const newGuard = (name: string, mode: Parameters<typeof createDockerGuard>[0]['mode']) =>
  createDockerGuard({ directory: join(root, name), mode });

/** Runs `docker <args>` the way a child process does: by name, through a PATH with the guard first. */
const runDocker = (guard: Awaited<ReturnType<typeof newGuard>>, args: string[]) => {
  const result = Bun.spawnSync({
    cmd: ['sh', '-c', 'docker "$@"', 'sh', ...args],
    env: { PATH: `${guard.binDirectory}:${laterDockerDirectory}:/usr/bin:/bin` },
    stdout: 'pipe',
    stderr: 'pipe'
  });
  return { exitCode: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
};

const laterDockerWasCalled = async () => (await readFile(laterDockerCalls, 'utf8').catch(() => '')).trim();

// The guard is a shell script found by a PATH lookup, which Windows cannot run. The CLI harness that installs it runs
// only in its Linux sandbox, so on Windows it refuses before any guard is needed.
describe.skipIf(process.platform !== 'linux')('Docker guard', () => {
  test('is what a PATH lookup of docker finds', async () => {
    const guard = await newGuard('resolution', 'platform-ready');
    expect(Bun.which('docker', { PATH: `${guard.binDirectory}:${laterDockerDirectory}:/usr/bin:/bin` })).toBe(
      guard.dockerPath
    );
  });

  test('answers a plain docker info as a running daemon, labelled simulated', async () => {
    const guard = await newGuard('info', 'platform-ready');
    const result = runDocker(guard, ['info']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Simulated: answered by the Stacktape measurement Docker guard');
    expect(await guard.readLog()).toEqual([
      {
        decision: 'simulated',
        operation: 'info',
        reason: 'controlled daemon probe: running',
        exitCode: 0,
        privileged: false,
        binfmt: false
      }
    ]);
  });

  test('answers docker info as an unreachable daemon in daemon-unreachable mode', async () => {
    const guard = await newGuard('info-unreachable', 'daemon-unreachable');
    const result = runDocker(guard, ['info']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Cannot connect to the Docker daemon');
    expect(result.stderr).toContain('simulated by the Stacktape measurement Docker guard');
    expect((await guard.readLog())[0]).toMatchObject({ decision: 'simulated', operation: 'info', exitCode: 1 });
  });

  test('refuses docker info with arguments', async () => {
    const guard = await newGuard('info-arguments', 'platform-ready');
    const result = runDocker(guard, ['info', '--format', '{{.ServerVersion}}']);
    expect(result.exitCode).toBe(1);
    expect((await guard.readLog())[0]).toMatchObject({ decision: 'denied', operation: 'info' });
  });

  test.each([
    ['platform-ready', 'linux/amd64, linux/amd64/v2, linux/amd64/v3, linux/arm64'],
    ['missing-platform', 'linux/amd64, linux/amd64/v2, linux/amd64/v3']
  ] as const)('answers buildx inspect itself in %s mode', async (mode, platforms) => {
    const guard = await newGuard(`inspect-${mode}`, mode);
    for (const args of [
      ['buildx', 'inspect'],
      ['buildx', 'inspect', '--bootstrap']
    ]) {
      const result = runDocker(guard, args);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(`Platforms:        ${platforms}\n`);
      expect(result.stdout).toContain('Simulated:');
    }
    expect((await guard.readLog()).map(({ decision, operation }) => `${decision} ${operation}`)).toEqual([
      'simulated buildx inspect',
      'simulated buildx inspect'
    ]);
  });

  test('simulates a failing buildx', async () => {
    const guard = await newGuard('inspect-failure', 'buildx-failure');
    const result = runDocker(guard, ['buildx', 'inspect', '--bootstrap']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('simulated buildx failure');
  });

  test('refuses the privileged binfmt installer', async () => {
    const guard = await newGuard('binfmt', 'missing-platform');
    const result = runDocker(guard, ['run', '--rm', '--privileged', 'tonistiigi/binfmt', '--install', 'linux/arm64']);
    expect(result.exitCode).toBe(125);
    expect(result.stderr).toContain('Stacktape measurement Docker guard refused docker run: binfmt installation.');
    expect(await guard.readLog()).toEqual([
      {
        decision: 'denied',
        operation: 'run',
        reason: 'binfmt installation',
        exitCode: 125,
        privileged: true,
        binfmt: true
      }
    ]);
  });

  test.each([
    [['run', '--privileged', 'alpine'], 'run', 'privileged container', 125],
    [['run', '--rm', 'alpine', 'true'], 'run', 'containers are not needed by a pure-JavaScript package sample', 125],
    [['run', '--rm', 'docker.io/tonistiigi/binfmt:latest', '--uninstall', 'qemu-*'], 'run', 'binfmt installation', 125],
    [['buildx', 'create', '--name', 'x', '--driver', 'docker-container'], 'buildx create', undefined, 1],
    [['buildx', 'use', 'stacktape-builder'], 'buildx use', undefined, 1],
    [['buildx', 'prune', '--all', '--force'], 'buildx prune', undefined, 1],
    [['builder', 'prune', '--force'], 'builder prune', undefined, 1],
    [['system', 'prune', '--all', '--force'], 'system', undefined, 1],
    [['image', 'rm', 'x'], 'image', undefined, 1],
    [['version'], 'version', undefined, 1],
    [['--context', 'desktop-linux', 'info'], 'global-options', undefined, 1],
    [[], 'global-options', undefined, 1]
  ] as const)('refuses %p', async (args, operation, reason, exitCode) => {
    const guard = await newGuard(`refuse-${operation.replace(' ', '-')}-${args.length}`, 'platform-ready');
    const result = runDocker(guard, [...args]);
    expect(result.exitCode).toBe(exitCode);
    const [record] = await guard.readLog();
    expect(record).toMatchObject({ decision: 'denied', operation, exitCode, ...(reason && { reason }) });
  });

  test('never records arguments', async () => {
    const guard = await newGuard('secrets', 'platform-ready');
    runDocker(guard, ['login', '--username', 'AWS', '--password', 'super-secret-token', 'https://registry.example']);
    runDocker(guard, ['run', '-e', 'TOKEN=super-secret-token', '--privileged', 'alpine']);
    runDocker(guard, ['super-secret-token']);
    const log = await readFile(guard.logPath, 'utf8');
    expect(log).not.toContain('super-secret-token');
    expect(log).not.toContain('registry.example');
    expect((await guard.readLog()).map(({ operation }) => operation)).toEqual(['login', 'run', 'unrecognized']);
  });

  // Runs last: every test above went through PATH, so a guard that fell through to a later docker would show here.
  test('never runs the docker later on PATH', async () => {
    expect(await laterDockerWasCalled()).toBe('');
  });
});
