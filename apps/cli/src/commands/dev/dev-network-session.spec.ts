import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localStatePaths } from 'src/config/local-state-paths';
import type { RelaySessionInfo } from './tunnel-manager';
import { holdStage, type StageHolderStore } from '@domain-services/dev-network/holders';
import {
  assertStageNotRunningElsewhere,
  endSessionForLostStage,
  refuseStageHeldElsewhere
} from './dev-network-session';

// The relay's session list as `stacktape dev` reads it before it deploys anything; the relay itself is covered in
// tunnel-manager/relay.spec.ts.

const relay = async () => ({ controlHost: '127.0.0.1', controlPort: 40001 });
const MACHINE = '0123456789abcdef';
const owner = { id: 'user-alice', label: 'Alice (alice-desktop)', session: `${process.pid}.${MACHINE}.desktop` };
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

  // r2p dogfood, finding 10: a start right after `stop` was refused because the relay still listed the stopped session.
  test('a holder from this user and directory whose process has exited is replaced, not reported', async () => {
    const ended: RelaySessionInfo = { ...laptop, session: `999999.${MACHINE}.old`, label: owner.label };
    const replaced = await assertStageNotRunningElsewhere({
      boxState: 'running',
      relay,
      listSessions: async () => [ended],
      stackName: 'shop-alice',
      owner,
      takeOver: false,
      isAlive: () => false
    });
    expect(replaced).toEqual({ replacesStaleSession: true });
    // A holder whose process still runs, one in another directory or of another user is a real holder.
    expect(await check({ listSessions: async () => [ended], isAlive: () => true })).toStartWith(
      'DEV_STAGE_RUNNING_ELSEWHERE: '
    );
    expect(
      await check({
        listSessions: async () => [{ ...ended, label: 'Alice (alice-desktop, ~/shop-wt2)' }],
        isAlive: () => false
      })
    ).toStartWith('DEV_STAGE_RUNNING_ELSEWHERE: ');
    expect(
      await check({ listSessions: async () => [{ ...ended, owner: 'user-bob' }], isAlive: () => false })
    ).toStartWith('DEV_STAGE_RUNNING_ELSEWHERE: ');
    // A session ID without a process ID and a machine (an older CLI) cannot be judged.
    for (const session of ['old-format', '999999.0c9b0a4e-6f2d-4d7c-9a51-2d8f0e7b1c3a']) {
      expect(await check({ listSessions: async () => [{ ...ended, session }], isAlive: () => false })).toStartWith(
        'DEV_STAGE_RUNNING_ELSEWHERE: '
      );
    }
  });

  // #343 review: two machines with the same hostname (a default laptop name, two containers) have the same label; a
  // process ID of the other machine says nothing about whether its session still runs.
  test('a holder on another machine with the same hostname and directory is a real holder', async () => {
    const otherMachine: RelaySessionInfo = {
      ...laptop,
      session: '999999.fedcba9876543210.old',
      label: owner.label
    };
    expect(await check({ listSessions: async () => [otherMachine], isAlive: () => false })).toStartWith(
      'DEV_STAGE_RUNNING_ELSEWHERE: '
    );
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

// Fifth dogfood (r2cc): a refusal in a far region took 22 s, because the check ran after the stack metadata and inside the
// network step. The holder record is one SSM read right after the configuration is loaded.
describe('the stage holder record', () => {
  const memoryStore = () => {
    const records = new Map<string, { value: string; modifiedAt: Date }>();
    const store: StageHolderStore = {
      read: async (name) => records.get(name),
      write: async (name, value) => void records.set(name, { value, modifiedAt: new Date() }),
      delete: async (name) => void records.delete(name)
    };
    return { records, store };
  };
  const NAME = '/stacktape/dev-network/stacktape-dev-network-test/holders/shop-alice';
  const refuse = (store: StageHolderStore, overrides: Partial<Parameters<typeof refuseStageHeldElsewhere>[0]> = {}) =>
    refuseStageHeldElsewhere({
      stackName: 'shop-alice',
      takeOver: false,
      store,
      networkName: 'stacktape-dev-network-test',
      owner,
      isAlive: () => true,
      ...overrides
    }).then(
      () => 'started',
      (error: { code?: string; message?: string }) => `${error.code}: ${error.message}`
    );

  test('a running session is refused at once, in the form its caller uses; a stopped one is not', async () => {
    const { store } = memoryStore();
    expect(await refuse(store)).toBe('started');
    const held = await holdStage({ store, name: NAME, holder: laptop });
    const refused = await refuse(store);
    expect(refused).toStartWith('DEV_STAGE_RUNNING_ELSEWHERE: Dev mode for shop-alice already runs in another session');
    expect(refused).toContain('Alice (alice-laptop)');
    expect(refused).toContain('run this command again with --take-over');
    Object.assign(process.env, { STP_OPERATION_INITIATOR: 'ai-agent', STP_OPERATION_INTERFACE: 'mcp' });
    try {
      const mcp = await refuse(store);
      expect(mcp).toContain('call stacktape_dev with action=start and args.takeOver=true');
      expect(mcp).not.toContain('--take-over');
    } finally {
      delete process.env.STP_OPERATION_INITIATOR;
      delete process.env.STP_OPERATION_INTERFACE;
    }
    // --take-over goes on to the relay check, which reports whom it replaces.
    expect(await refuse(store, { takeOver: true })).toBe('started');
    await held.release();
    expect(await refuse(store)).toBe('started');
  });

  test('a record that stopped changing, or of an exited process in this directory, does not refuse', async () => {
    const { records, store } = memoryStore();
    await holdStage({ store, name: NAME, holder: laptop });
    records.get(NAME)!.modifiedAt = new Date(Date.now() - 4 * 60_000);
    expect(await refuse(store)).toBe('started');
    // The same developer, directory and machine, but a process that has exited: killed without its cleanup.
    const exited = { ...laptop, label: owner.label, session: `999999.${MACHINE}.killed` };
    await holdStage({ store, name: NAME, holder: exited });
    expect(await refuse(store, { isAlive: () => false })).toBe('started');
    expect(await refuse(store, { isAlive: () => true })).toStartWith('DEV_STAGE_RUNNING_ELSEWHERE');
  });

  test('after a take-over, the new holder keeps the record; the replaced session neither refreshes nor deletes it', async () => {
    const { records, store } = memoryStore();
    const replaced = await holdStage({ store, name: NAME, holder: laptop, refreshMs: 5 });
    const desktop = { ...laptop, session: 'desktop', label: 'Alice (alice-desktop)' };
    const holder = await holdStage({ store, name: NAME, holder: desktop, refreshMs: 5 });
    // Until the relay tells it, the replaced session may still refresh over the new holder's record; the new holder's
    // next refresh writes it back.
    await new Promise((resolve) => setTimeout(resolve, 30));
    replaced.lose();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(JSON.parse(records.get(NAME)!.value).session).toBe('desktop');
    await replaced.release();
    expect(JSON.parse(records.get(NAME)!.value).session).toBe('desktop');
    await holder.release();
    expect(records.has(NAME)).toBe(false);
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

      // A session the relay refused because another one started at the same time never had the stage.
      const refused = endSessionForLostStage({
        stackName: 'shop-alice',
        label: 'Alice (alice-laptop)',
        agentPort: 7401,
        refused: true,
        stop: () => stops++
      });
      expect(refused).toContain('Dev mode for shop-alice already runs in another session: Alice (alice-laptop)');
      expect(JSON.parse(readFileSync(localStatePaths.devAgentStopReasonFile({ port: 7401 }), 'utf-8'))).toMatchObject({
        code: 'DEV_STAGE_RUNNING_ELSEWHERE'
      });
    } finally {
      if (original === undefined) delete process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
      else process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = original;
      rmSync(tokenDirectory, { recursive: true, force: true });
    }
  });
});
