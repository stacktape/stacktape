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
  // `unlocked`: a live session whose lock file a refused second start deleted (r2rr). Its process still runs.
  // `adopted`: a database a crashed session started and the recovered session took over as it ran (r2bd). Docker cannot
  // change a running container's labels, so its process label still names the crashed session; the lock file at its
  // lock-file label is held by the live session that uses it now.
  const names = ['live', 'abandoned', 'stopped', 'legacy', 'unlocked', 'adopted'].map(
    (kind) => `stp-t07-${owner}-${kind}`
  );
  // A customer's own stopped container: not a Stacktape dev container, so cleanup must never list or remove it.
  const foreign = `customer-${owner}-stopped`;
  const lock = join(directory, 'live.json');
  const invoke = (args: string[]) => spawnSync(docker!, args, { encoding: 'utf8', timeout: 60_000 });
  const inspect = (name: string) => invoke(['inspect', '--format', '{{.State.Status}}', name]);
  // The process of a session that ended: it ran and exited.
  const ended = spawnSync(process.execPath, ['-e', 'console.log(process.pid)'], { encoding: 'utf8' });
  const endedPid = Number(ended.stdout.trim());
  try {
    expect(endedPid).toBeGreaterThan(0);
    await writeFile(lock, JSON.stringify({ pid: process.pid }));
    const foreignCreated = invoke([
      'create',
      '--name',
      foreign,
      '--label',
      `stacktape.qa.task=${owner}`,
      'alpine:3',
      'true'
    ]);
    expect(foreignCreated.status, foreignCreated.stderr).toBe(0);
    for (const [index, name] of names.entries()) {
      const labels = ['--label', `stacktape.qa.task=${owner}`];
      if (index < 2 || index >= 4)
        labels.push(
          '--label',
          `stacktape.dev.lock=${index === 0 || index === 5 ? lock : join(directory, 'missing.json')}`,
          '--label',
          `stacktape.dev.pid=${index === 1 || index === 5 ? endedPid : process.pid}`
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
const names = ${JSON.stringify([...names, foreign])};
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
    expect(inspect(names[4]).stdout.trim()).toBe('running');
    expect(inspect(names[5]).stdout.trim()).toBe('running');
    expect(inspect(foreign).stdout.trim()).toBe('created');
    for (const name of [names[1], names[2]]) {
      const absent = inspect(name);
      expect(absent.status).not.toBe(0);
      expect(absent.stderr).toMatch(/no such (object|container)/i);
    }
  } finally {
    for (const name of [...names, foreign]) {
      const removed = invoke(['rm', '-f', name]);
      if (removed.status !== 0) expect(removed.stderr).toMatch(/no such (object|container)/i);
      expect(inspect(name).status, `owned container ${name} must be gone`).not.toBe(0);
    }
    await rm(directory, { recursive: true, force: true });
  }
}, 120_000);

// r2at: after `kill -9` or `taskkill /f`, a session's containers kept running until `dev stop --cleanup-containers`.
// The next start of the same project and stage removes them; it takes over the databases it runs and leaves other
// stages, other checkouts, live sessions and containers without owner labels alone.
test('a new session removes the containers a killed session of its project and stage left, and nothing else', async () => {
  const docker = Bun.which('docker');
  expect(docker, 'Docker is required for this explicit change lane').toBeTruthy();
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-start-cleanup-'));
  const owner = randomUUID();
  const ownLock = join(directory, 'shop-dev.json');
  const otherStageLock = join(directory, 'shop-test.json');
  const otherCheckoutLock = join(directory, 'checkout-2', 'shop-dev.json');
  const ended = spawnSync(process.execPath, ['-e', 'console.log(process.pid)'], { encoding: 'utf8' });
  const endedPid = Number(ended.stdout.trim());
  // kind -> [lock file, owner pid, started]; no lock file means no owner labels (an older CLI).
  const fixtures: Record<string, [string | undefined, number, boolean]> = {
    killed: [ownLock, endedPid, true],
    'killed-next': [ownLock, endedPid, true],
    'killed-stopped': [ownLock, endedPid, false],
    'taken-over-db': [ownLock, endedPid, true],
    'current-session': [ownLock, process.pid, true],
    'other-stage': [otherStageLock, endedPid, true],
    'other-checkout': [otherCheckoutLock, endedPid, true],
    'live-other-stage': [otherStageLock, process.pid, true],
    unlabeled: [undefined, endedPid, true]
  };
  const nameOf = (kind: string) => `stp-t07-${owner}-${kind}`;
  const names = Object.keys(fixtures).map(nameOf);
  const invoke = (args: string[]) => spawnSync(docker!, args, { encoding: 'utf8', timeout: 60_000 });
  const inspect = (name: string) => invoke(['inspect', '--format', '{{.State.Status}}', name]);
  try {
    expect(endedPid).toBeGreaterThan(0);
    for (const [kind, [lockFile, pid, started]] of Object.entries(fixtures)) {
      const labels = ['--label', `stacktape.qa.task=${owner}`];
      if (lockFile)
        labels.push(
          '--label',
          `stacktape.dev.lock=${lockFile}`,
          '--label',
          `stacktape.dev.pid=${pid}`,
          '--label',
          `stacktape.dev.stage=${lockFile === otherStageLock ? 'test' : 'dev'}`
        );
      // A workload container runs with --rm, so stopping it already removes it; it still counts as removed.
      const autoRemove = kind === 'killed' ? ['--rm'] : [];
      const created = invoke(['create', '--name', nameOf(kind), ...autoRemove, ...labels, 'alpine:3', 'sleep', '600']);
      expect(created.status, created.stderr).toBe(0);
      if (started) expect(invoke(['start', nameOf(kind)]).status).toBe(0);
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
    const driver = join(directory, 'start-cleanup.ts');
    // The new session of shop/dev: this test process stands for it, as it holds the stage's lock file.
    await writeFile(
      driver,
      `import { removeContainersOfEndedSessions, setDevSessionOwner } from ${JSON.stringify(resolve(import.meta.dir, '../../src/commands/dev/cleanup-utils.ts'))};
setDevSessionOwner({ lockFile: ${JSON.stringify(ownLock)}, pid: ${process.pid}, stage: 'dev' });
console.log('REMOVED ' + JSON.stringify(await removeContainersOfEndedSessions({ keep: new Set([${JSON.stringify(nameOf('taken-over-db'))}]) })));
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
    ) as string[];
    const removedKinds = ['killed', 'killed-next', 'killed-stopped'];
    expect(removed.toSorted()).toEqual(removedKinds.map(nameOf).toSorted());
    // Docker may still be finishing the removal of a --rm container when `rm -f` returns.
    for (const kind of removedKinds) {
      const deadline = Date.now() + 10_000;
      while (inspect(nameOf(kind)).status === 0 && Date.now() < deadline) await Bun.sleep(200);
      expect(inspect(nameOf(kind)).status, kind).not.toBe(0);
    }
    for (const kind of Object.keys(fixtures).filter((kind) => !removedKinds.includes(kind)))
      expect(inspect(nameOf(kind)).stdout.trim(), kind).toBe('running');
  } finally {
    // Every fixture is removed before anything is asserted, so a failed check cannot leave the others behind.
    for (const name of names) invoke(['rm', '-f', name]);
    await rm(directory, { recursive: true, force: true });
    for (const name of names) {
      const deadline = Date.now() + 10_000;
      while (inspect(name).status === 0 && Date.now() < deadline) await Bun.sleep(200);
      expect(inspect(name).status, `owned container ${name} must be gone`).not.toBe(0);
    }
  }
}, 120_000);
