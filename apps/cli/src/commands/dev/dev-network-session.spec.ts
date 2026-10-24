import { describe, expect, test } from 'bun:test';
import type { RelaySessionInfo } from './tunnel-manager';
import { assertStageNotRunningElsewhere } from './dev-network-session';

// The relay's session list as `stacktape dev` reads it before it deploys anything; the relay itself is covered in
// tunnel-manager/relay.spec.ts.

const relay = async () => ({ controlHost: '127.0.0.1', controlPort: 40001 });
const owner = { id: 'user-alice', label: 'Alice (alice-desktop)', session: 'desktop' };
const laptop: RelaySessionInfo = {
  stack: 'shop-alice',
  session: 'laptop',
  owner: 'user-alice',
  label: 'Alice (alice-laptop)',
  since: 1_700_000_000
};
const check = (overrides: Partial<Parameters<typeof assertStageNotRunningElsewhere>[0]>) =>
  assertStageNotRunningElsewhere({
    boxState: 'running',
    relay,
    listSessions: async () => [laptop, { ...laptop, session: owner.session, label: owner.label }],
    stackName: 'shop-alice',
    owner,
    takeOver: false,
    ...overrides
  }).then(
    () => 'started',
    (error: { code?: string; message?: string }) => `${error.code}: ${error.message}`
  );

describe('the stage check before a dev session deploys', () => {
  test('refuses a stage another session runs, the same developer on another machine too, and names it', async () => {
    const result = await check({});
    expect(result).toStartWith('DEV_STAGE_RUNNING_ELSEWHERE: ');
    expect(result).toContain('Alice (alice-laptop)');
    expect(result).not.toContain('alice-desktop');
  });

  test('--take-over starts anyway; its own session alone does not count', async () => {
    expect(await check({ takeOver: true })).toBe('started');
    expect(await check({ listSessions: async () => [{ ...laptop, session: owner.session }] })).toBe('started');
  });

  test('a box that does not run has no session to ask, and an unreachable relay leaves the decision to the tunnels', async () => {
    let asked = false;
    const listSessions = async () => {
      asked = true;
      return [laptop];
    };
    for (const boxState of ['stopped', 'stopping', undefined])
      expect(await check({ boxState, listSessions })).toBe('started');
    expect(asked).toBe(false);
    expect(await check({ relay: () => new Promise(() => {}), listSessions, timeoutMs: 20 })).toBe('started');
    expect(
      await check({
        listSessions: async () => {
          throw new Error('The dev box relay does not list its sessions.');
        }
      })
    ).toBe('started');
  });
});
