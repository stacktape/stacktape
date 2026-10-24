import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localStatePaths } from 'src/config/local-state-paths';
import type { RelaySessionInfo } from './tunnel-manager';
import { assertStageNotRunningElsewhere, endSessionForLostStage } from './dev-network-session';

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

describe('a session whose stage another session took over', () => {
  test('stops itself and, in agent mode, records why for clients that find the agent gone', () => {
    const tokenDirectory = mkdtempSync(join(tmpdir(), 'stacktape-dev-stop-reason-'));
    const original = process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
    process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = tokenDirectory;
    try {
      let stops = 0;
      const message = endSessionForLostStage({
        stackName: 'shop-alice',
        label: 'Alice (alice-laptop, ~/shop-wt2)',
        agentPort: 7400,
        stop: () => stops++
      });
      expect(stops).toBe(1);
      expect(message).toContain('Alice (alice-laptop, ~/shop-wt2) took over dev mode for shop-alice');
      expect(message).toContain('--take-over');
      const recorded = JSON.parse(readFileSync(localStatePaths.devAgentStopReasonFile({ port: 7400 }), 'utf-8'));
      expect(recorded).toMatchObject({ code: 'DEV_STAGE_TAKEN_OVER', message, pid: process.pid });
    } finally {
      if (original === undefined) delete process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
      else process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = original;
      rmSync(tokenDirectory, { recursive: true, force: true });
    }
  });
});
