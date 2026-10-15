import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, delimiter } from 'node:path';
import { runProcess } from '../../scripts/qualification/process';

// This lane uses real Docker state. The executable wrapper limits discovery and mutations to this test's containers
// so the production cleanup command cannot touch another session on the shared daemon.
test('container cleanup removes abandoned and stopped containers while preserving live and legacy sessions', async () => {
  const docker = Bun.which('docker');
  expect(docker, 'Docker is required for this explicit change lane').toBeTruthy();
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-container-cleanup-'));
  const owner = randomUUID();
  const names = ['live', 'abandoned', 'stopped', 'legacy'].map((kind) => `stp-t07-${owner}-${kind}`);
  const lock = join(directory, 'live.json');
  const invoke = (args: string[]) => spawnSync(docker!, args, { encoding: 'utf8', timeout: 60_000 });
  const inspect = (name: string) => invoke(['inspect', '--format', '{{.State.Status}}', name]);
  try {
    await writeFile(lock, JSON.stringify({ pid: process.pid }));
    for (const [index, name] of names.entries()) {
      const labels = ['--label', `stacktape.qa.task=${owner}`];
      if (index < 2)
        labels.push(
          '--label',
          `stacktape.dev.lock=${index === 0 ? lock : join(directory, 'missing.json')}`,
          '--label',
          `stacktape.dev.pid=${process.pid}`
        );
      const created = invoke(['create', '--name', name, ...labels, 'alpine:3', 'sleep', '600']);
      expect(created.status, created.stderr).toBe(0);
      if (index !== 2) {
        const started = invoke(['start', name]);
        expect(started.status, started.stderr).toBe(0);
      }
    }
    const wrapper = join(directory, 'docker');
    await writeFile(
      wrapper,
      `#!${process.execPath}
import { spawnSync } from 'node:child_process';
const args = process.argv.slice(2);
const names = ${JSON.stringify(names)};
if (args[0] === 'ps') args.push('--filter', ${JSON.stringify(`label=stacktape.qa.task=${owner}`)});
else if (!['stop', 'rm'].includes(args[0]) || !names.includes(args.at(-1))) {
  console.error('Refusing a Docker command outside the owned fixture'); process.exit(1);
}
const result = spawnSync(${JSON.stringify(docker)}, args, { stdio:'inherit', timeout:60000 });
process.exit(result.status ?? 1);
`,
      { mode: 0o755 }
    );
    const driver = join(directory, 'cleanup.ts');
    await writeFile(
      driver,
      `import { cleanupOrphanedContainers } from ${JSON.stringify(resolve(import.meta.dir, '../../src/commands/dev/cleanup-utils.ts'))};
console.log('REMOVED ' + JSON.stringify(await cleanupOrphanedContainers()));
`
    );
    const result = await runProcess({
      command: process.execPath,
      args: ['--no-env-file', '--preload', resolve(import.meta.dir, '../../scripts/test-preload.ts'), driver],
      cwd: resolve(import.meta.dir, '../..'),
      env: {
        PATH: directory + delimiter + process.env.PATH,
        HOME: directory,
        SKIP_LOADING_ENV: '1',
        STP_DISABLE_TELEMETRY: '1'
      },
      timeoutMs: 60_000
    });
    expect(result.exitCode, result.stderr).toBe(0);
    const removed = JSON.parse(
      result.stdout
        .split('\n')
        .find((line) => line.startsWith('REMOVED '))!
        .slice(8)
    );
    expect(removed.sort()).toEqual([names[1], names[2]].sort());
    expect(inspect(names[0]).stdout.trim()).toBe('running');
    expect(inspect(names[3]).stdout.trim()).toBe('running');
    for (const name of [names[1], names[2]]) {
      const absent = inspect(name);
      expect(absent.status).not.toBe(0);
      expect(absent.stderr).toMatch(/no such (object|container)/i);
    }
  } finally {
    for (const name of names) {
      const removed = invoke(['rm', '-f', name]);
      if (removed.status !== 0) expect(removed.stderr).toMatch(/no such (object|container)/i);
      expect(inspect(name).status, `owned container ${name} must be gone`).not.toBe(0);
    }
    await rm(directory, { recursive: true, force: true });
  }
}, 120_000);
