import { describe, expect, test } from 'bun:test';
import { getDevContainerName, selectOrphanedDevContainers } from './cleanup-utils';

describe('dev container names', () => {
  test('two projects with the same stage and resource names get different containers', () => {
    const shop = getDevContainerName({ projectName: 'shop', stage: 'dev', name: 'mainDatabase' });
    const blog = getDevContainerName({ projectName: 'blog', stage: 'dev', name: 'mainDatabase' });
    expect(shop).not.toBe(blog);
    expect([shop, blog]).toEqual(['stp-shop-dev-mainDatabase', 'stp-blog-dev-mainDatabase']);
  });

  test('`dev:stop --cleanupContainers` removes only the containers no running agent owns', () => {
    const containers = [
      'stp-shop-dev-mainDatabase',
      'stp-shop-dev-api-service-container',
      'stp-blog-dev-mainDatabase',
      'stp-shop-prod-mainDatabase',
      // Named before containers included the project; still owned by the agent of their stage.
      'stp-dev-cache',
      'stp-staging-cache'
    ];
    expect(selectOrphanedDevContainers(containers, [{ projectName: 'shop', stage: 'dev' }])).toEqual([
      'stp-blog-dev-mainDatabase',
      'stp-shop-prod-mainDatabase',
      'stp-staging-cache'
    ]);
    expect(selectOrphanedDevContainers(containers, [])).toEqual(containers);
  });
});
