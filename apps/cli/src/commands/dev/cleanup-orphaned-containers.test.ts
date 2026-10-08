import { expect, mock, test } from 'bun:test';

// OPEN PRODUCT BUG, failing on purpose (J4 handoff, bug 6). `dev:stop --cleanupContainers` lists every `stp-*`
// container and removes those that no agent lock file in the current directory claims. A terminal `dev` session writes
// no lock file, so its running database is removed while the developer is using it. Which containers count as
// orphaned is an owner decision (a lock file for every session, or only stopped containers); this test states the
// outcome either choice must keep: a running session's container survives cleanup.

const dockerCalls: string[][] = [];
// One running database of a terminal session in another project: no agent anywhere knows about it.
const containers = [{ name: 'stp-shop-dev-mainDatabase', state: 'running' }];

mock.module('@utils/docker', () => ({
  execDocker: async (args: string[]) => {
    dockerCalls.push(args);
    if (args[0] !== 'ps') return { stdout: '', stderr: '', exitCode: 0 };
    const format = args[args.indexOf('--format') + 1] ?? '{{.Names}}';
    const stdout = containers
      .map(({ name, state }) => format.replaceAll('{{.Names}}', name).replaceAll('{{.State}}', state))
      .join('\n');
    return { stdout, stderr: '', exitCode: 0 };
  }
}));
mock.module('./agent-daemon', () => ({ getAllRunningAgents: async () => [] }));

test('`dev:stop --cleanupContainers` keeps the containers of a dev session that is still running', async () => {
  const { cleanupOrphanedContainers } = await import('./cleanup-utils');
  const removed = await cleanupOrphanedContainers();

  expect(removed).toEqual([]);
  expect(dockerCalls.filter(([command]) => command === 'stop' || command === 'rm')).toEqual([]);
});
