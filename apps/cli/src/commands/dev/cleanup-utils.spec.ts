import { describe, expect, test } from 'bun:test';
import { getDevContainerName, selectRemovableDevContainers } from './cleanup-utils';

describe('dev container names', () => {
  test('two projects with the same stage and resource names get different containers', () => {
    const shop = getDevContainerName({ projectName: 'shop', stage: 'dev', name: 'mainDatabase' });
    const blog = getDevContainerName({ projectName: 'blog', stage: 'dev', name: 'mainDatabase' });
    expect(shop).not.toBe(blog);
    expect([shop, blog]).toEqual(['stp-shop-dev-mainDatabase', 'stp-blog-dev-mainDatabase']);
  });

  test('`dev:stop --cleanupContainers` removes stopped containers and those of sessions known to be gone', () => {
    const live = { lockFile: '/work/shop/.stacktape/dev-agents/shop-dev.json', pid: 4100 };
    const sessionIsAlive = ({ lockFile, pid }: { lockFile: string; pid: number }) =>
      lockFile === live.lockFile && pid === live.pid;
    const containers = [
      { name: 'stp-shop-dev-mainDatabase', state: 'running', ...live },
      { name: 'stp-shop-dev-cache', state: 'exited', ...live },
      // The lock file is gone or names another process: the session that started it has ended.
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
});
