import { describe, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { getDevContainerName, isDevSessionAlive, selectRemovableDevContainers } from './cleanup-utils';

describe('dev container names', () => {
  test('projects and checkouts that share a stage and resource names get different containers', () => {
    const name = (projectName: string, workingDirectory: string) =>
      getDevContainerName({ projectName, stage: 'dev', workingDirectory, name: 'mainDatabase' });
    const shop = name('shop', '/work/shop');
    const blog = name('blog', '/work/blog');
    // A Git worktree of the same project has its own data directory, so it must not reuse or stop shop's container.
    const shopWorktree = name('shop', '/work/shop-feature');
    expect(new Set([shop, blog, shopWorktree]).size).toBe(3);
    expect(shop).toMatch(/^stp-shop-dev-[0-9a-f]{8}-mainDatabase$/);
    // The same checkout reaches the same container from any spelling of its path, so a restart reuses it.
    expect(name('shop', '/work/shop/')).toBe(shop);
    expect(name('shop', '/work/other/../shop')).toBe(shop);
  });

  test('`dev:stop --cleanupContainers` removes stopped containers and those of sessions known to be gone', () => {
    const live = { lockFile: '/work/shop/.stacktape/dev-agents/shop-dev.json', pid: 4100 };
    const sessionIsAlive = ({ lockFile, pid }: { lockFile: string; pid: number }) =>
      lockFile === live.lockFile && pid === live.pid;
    const containers = [
      { name: 'stp-shop-dev-mainDatabase', state: 'running', ...live },
      { name: 'stp-shop-dev-cache', state: 'exited', ...live },
      // The process that started it has exited.
      { name: 'stp-blog-dev-mainDatabase', state: 'running', lockFile: '/work/blog/gone.json', pid: 4200 },
      { name: 'stp-blog-dev-cache', state: 'running', lockFile: live.lockFile, pid: 4300 },
      { name: 'stp-old-dev-db', state: 'created' },
      // Started by an older CLI without owner labels: its session cannot be checked, so it stays.
      { name: 'stp-dev-legacy', state: 'running' }
    ];
    expect(selectRemovableDevContainers(containers, sessionIsAlive)).toEqual([
      'stp-shop-dev-cache',
      'stp-blog-dev-mainDatabase',
      'stp-blog-dev-cache',
      'stp-old-dev-db'
    ]);
  });

  // r2rr: a refused second start deleted the live session's lock file, and cleanup then removed its databases.
  test("a container's session is alive while its process runs, whatever its lock file says", async () => {
    const session = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60_000)'], { stdio: 'ignore' });
    const exited = new Promise((resolve) => session.once('exit', resolve));
    try {
      expect(
        isDevSessionAlive({ lockFile: '/work/shop/.stacktape/dev-agents/missing.json', pid: session.pid! })
      ).toBeTrue();
    } finally {
      session.kill('SIGKILL');
    }
    await exited;
    expect(
      isDevSessionAlive({ lockFile: '/work/shop/.stacktape/dev-agents/missing.json', pid: session.pid! })
    ).toBeFalse();
  });
});
