import { afterAll, expect, mock, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// `dev:stop --cleanupContainers` used to remove every `stp-*` container that no agent lock file in the current
// directory claimed, so a terminal `dev` session (which wrote no lock file) or another project's agent lost its
// running database. Every session now writes a lock file and labels its containers with it and its pid; cleanup
// removes stopped containers and those whose session is known to be gone.

const directory = mkdtempSync(join(tmpdir(), 'stacktape-dev-cleanup-'));
const liveLock = join(directory, 'shop-dev.json');
writeFileSync(liveLock, JSON.stringify({ pid: process.pid, port: 0, phase: 'ready' }));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

const containers = [
  // A terminal session of another project that is still running.
  { name: 'stp-shop-dev-mainDatabase', state: 'running', lock: liveLock, pid: String(process.pid) },
  // Its session ended without cleaning up: the lock file is gone.
  { name: 'stp-blog-dev-mainDatabase', state: 'running', lock: join(directory, 'blog-dev.json'), pid: '999999' },
  { name: 'stp-shop-dev-old', state: 'exited', lock: '', pid: '' }
];

const dockerCalls: string[][] = [];
mock.module('@utils/docker', () => ({
  execDocker: async (args: string[]) => {
    dockerCalls.push(args);
    if (args[0] !== 'ps') return { stdout: '', stderr: '', exitCode: 0 };
    const format = args[args.indexOf('--format') + 1];
    const stdout = containers
      .map(({ name, state, lock, pid }) =>
        format
          .replaceAll('{{.Names}}', name)
          .replaceAll('{{.State}}', state)
          .replaceAll('{{.Label "stacktape.dev.lock"}}', lock)
          .replaceAll('{{.Label "stacktape.dev.pid"}}', pid)
      )
      .join('\n');
    return { stdout, stderr: '', exitCode: 0 };
  }
}));

test("`dev:stop --cleanupContainers` keeps a running session's containers and removes abandoned ones", async () => {
  const { cleanupOrphanedContainers } = await import('./cleanup-utils');
  const removed = await cleanupOrphanedContainers();

  expect(removed).toEqual(['stp-blog-dev-mainDatabase', 'stp-shop-dev-old']);
  const touched = dockerCalls.filter(([command]) => command === 'stop' || command === 'rm').map((args) => args.at(-1));
  expect(touched).not.toContain('stp-shop-dev-mainDatabase');
});
