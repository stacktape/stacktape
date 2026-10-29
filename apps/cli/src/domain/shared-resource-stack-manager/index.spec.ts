import { describe, expect, test } from 'bun:test';
import {
  SharedResourceStackManager,
  type SharedResourceStackAdapter,
  type SharedStackDetails,
  type SharedStackRequirement
} from '.';

const template = { Resources: {} };
const details = ({
  version = 1,
  status = 'CREATE_COMPLETE',
  parameters = { RegionHint: 'eu-west-1' },
  kind = 'test-kind',
  ownershipKey = 'shared-key',
  roleArn
}: {
  version?: number;
  status?: string;
  parameters?: Record<string, string>;
  kind?: string;
  ownershipKey?: string;
  roleArn?: string;
} = {}): SharedStackDetails => ({
  RoleARN: roleArn,
  StackStatus: status,
  Outputs: [
    { OutputKey: 'ContractVersion', OutputValue: `${version}` },
    { OutputKey: 'ResourceKind', OutputValue: kind },
    { OutputKey: 'OwnershipKey', OutputValue: ownershipKey }
  ],
  Parameters: Object.entries(parameters).map(([ParameterKey, ParameterValue]) => ({ ParameterKey, ParameterValue }))
});

const requirement = (overrides: Partial<SharedStackRequirement> = {}): SharedStackRequirement => ({
  kind: 'test-kind',
  ownershipKey: 'shared-key',
  contractVersion: 1,
  stackName: 'stacktape-shared-test',
  parameters: { RegionHint: 'eu-west-1' },
  template,
  beforeCreate: async () => {},
  ...overrides
});

describe('shared resource stack manager', () => {
  test('converges when pre-create availability loses a create race', async () => {
    const stable = details();
    let reads = 0;
    const raceAdapter: SharedResourceStackAdapter = {
      get: async () => (++reads >= 3 ? stable : undefined),
      create: async () => {
        throw new Error('must not create');
      },
      update: async () => {}
    };
    const manager = new SharedResourceStackManager({ adapter: raceAdapter, pollIntervalMs: 0 });
    expect(
      await manager.ensure(
        requirement({
          beforeCreate: async () => {
            throw new Error('provider resource now exists');
          }
        })
      )
    ).toEqual({ action: 'reuse', stackName: 'stacktape-shared-test' });
  });

  test('re-evaluates state after a concurrent updater finishes', async () => {
    let stack = details({ version: 0 });
    let updateCalls = 0;
    const raceAdapter: SharedResourceStackAdapter = {
      get: async () => stack,
      create: async () => {},
      update: async ({ parameters, tags }) => {
        updateCalls += 1;
        if (updateCalls === 1) {
          stack = details({ version: 0 });
          throw new Error('Stack is in UPDATE_IN_PROGRESS state');
        }
        stack = details({
          version: Number(tags.find(({ Key }) => Key === 'stacktape:shared-resource-contract-version')?.Value),
          parameters: Object.fromEntries(
            parameters.map(({ ParameterKey, ParameterValue }) => [ParameterKey, ParameterValue])
          )
        });
      }
    };
    const manager = new SharedResourceStackManager({ adapter: raceAdapter, pollIntervalMs: 0 });
    expect((await manager.ensure(requirement())).action).toBe('upgrade');
    expect(updateCalls).toBe(2);
  });

  test('times out boundedly while a stack remains in progress', async () => {
    const stuck: SharedResourceStackAdapter = {
      get: async () => details({ status: 'UPDATE_IN_PROGRESS' }),
      create: async () => {},
      update: async () => {}
    };
    const manager = new SharedResourceStackManager({
      adapter: stuck,
      maxWaitMs: 2,
      pollIntervalMs: 1,
      wait: async () => {}
    });
    await expect(manager.ensure(requirement())).rejects.toThrow('Timed out');
    await expect(manager.ensure(requirement())).rejects.toMatchObject({ code: 'SHARED_STACK_WAIT_TIMEOUT' });
  });
});

describe('a stack whose last upgrade was rolled back', () => {
  test('serves callers its contract version satisfies', async () => {
    const adapter: SharedResourceStackAdapter = {
      get: async () => details({ version: 2, status: 'UPDATE_ROLLBACK_COMPLETE' }),
      create: async () => {
        throw new Error('must not create');
      },
      update: async () => {
        throw new Error('must not update');
      }
    };
    const manager = new SharedResourceStackManager({ adapter, pollIntervalMs: 0 });
    expect(await manager.ensure(requirement({ contractVersion: 2 }))).toEqual({
      action: 'reuse',
      stackName: 'stacktape-shared-test'
    });
  });

  test('is upgraded again by a caller that needs more, and a second rollback fails once instead of looping', async () => {
    let updates = 0;
    const adapter: SharedResourceStackAdapter = {
      get: async () => details({ version: 1, status: 'UPDATE_ROLLBACK_COMPLETE' }),
      create: async () => {},
      update: async () => {
        updates += 1;
      }
    };
    const manager = new SharedResourceStackManager({ adapter, pollIntervalMs: 0, wait: async () => {} });
    await expect(manager.ensure(requirement({ contractVersion: 2 }))).rejects.toMatchObject({
      code: 'SHARED_STACK_UPDATE_ROLLED_BACK'
    });
    expect(updates).toBe(1);
  });

  test('a caller that needs more upgrades it from the rolled-back state', async () => {
    let stack = details({ version: 1, status: 'UPDATE_ROLLBACK_COMPLETE' });
    const adapter: SharedResourceStackAdapter = {
      get: async () => stack,
      create: async () => {},
      update: async () => {
        stack = details({ version: 2, status: 'UPDATE_COMPLETE' });
      }
    };
    const manager = new SharedResourceStackManager({ adapter, pollIntervalMs: 0, wait: async () => {} });
    expect(await manager.ensure(requirement({ contractVersion: 2 }))).toEqual({
      action: 'upgrade',
      stackName: 'stacktape-shared-test'
    });
  });
});

describe('waiting for a failed creation', () => {
  const failing = (statuses: Array<SharedStackDetails | undefined>) => {
    let reads = 0;
    let created = false;
    const adapter: SharedResourceStackAdapter = {
      get: async () => (created ? statuses[Math.min(reads++, statuses.length - 1)] : undefined),
      create: async () => void (created = true),
      update: async () => {}
    };
    return adapter;
  };
  const reason = 'The following resource(s) failed to create: [Keeper].';
  const inState = (StackStatus: string): SharedStackDetails => ({ StackStatus, StackStatusReason: reason });

  test('waits longer for a rollback than for the creation, and names the real state when it gives up', async () => {
    // 3 polls of creation, then the rollback: 10 more polls fit only into the rollback limit.
    const statuses = [
      ...Array.from({ length: 3 }, () => inState('CREATE_IN_PROGRESS')),
      ...Array.from({ length: 10 }, () => inState('DELETE_IN_PROGRESS')),
      undefined
    ];
    const manager = new SharedResourceStackManager({
      adapter: failing(statuses),
      pollIntervalMs: 1,
      maxWaitMs: 5,
      rollbackMaxWaitMs: 50,
      wait: async () => {}
    });
    const error = await manager.ensure(requirement()).catch((caught: { code?: string; message?: string }) => caught);
    expect(error).toMatchObject({ code: 'SHARED_STACK_DISAPPEARED' });
    expect((error as { message: string }).message).toContain(`last state DELETE_IN_PROGRESS: ${reason}`);

    const stuck = new SharedResourceStackManager({
      adapter: failing([inState('DELETE_IN_PROGRESS')]),
      pollIntervalMs: 1,
      maxWaitMs: 5,
      rollbackMaxWaitMs: 20,
      wait: async () => {}
    });
    const timeout = await stuck.ensure(requirement()).catch((caught: { code?: string; message?: string }) => caught);
    expect(timeout).toMatchObject({ code: 'SHARED_STACK_WAIT_TIMEOUT' });
    expect((timeout as { message: string }).message).toContain(`current state: DELETE_IN_PROGRESS: ${reason}`);
  });
});
