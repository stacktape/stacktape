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

const adapter = (initial?: SharedStackDetails) => {
  let stack = initial;
  const calls = { create: 0, update: 0 };
  const value: SharedResourceStackAdapter = {
    get: async () => stack,
    create: async () => {
      calls.create += 1;
      stack = details();
    },
    update: async ({ parameters, tags }) => {
      calls.update += 1;
      stack = details({
        version: Number(tags.find(({ Key }) => Key === 'stacktape:shared-resource-contract-version')?.Value),
        roleArn: stack?.RoleARN,
        parameters: Object.fromEntries(
          parameters.map(({ ParameterKey, ParameterValue }) => [ParameterKey, ParameterValue])
        )
      });
    }
  };
  return { calls, value, setStack: (next: SharedStackDetails) => (stack = next) };
};

describe('shared resource stack manager', () => {
  test('creates once and reuses the same ownership contract', async () => {
    const fake = adapter();
    const manager = new SharedResourceStackManager({ adapter: fake.value, pollIntervalMs: 0 });
    expect(await manager.ensure(requirement())).toEqual({ action: 'create', stackName: 'stacktape-shared-test' });
    expect(await manager.ensure(requirement())).toEqual({ action: 'reuse', stackName: 'stacktape-shared-test' });
    expect(fake.calls).toEqual({ create: 1, update: 0 });
  });

  test('upgrades older contracts and never downgrades newer contracts', async () => {
    const old = adapter(details({ version: 0 }));
    const oldManager = new SharedResourceStackManager({ adapter: old.value, pollIntervalMs: 0 });
    expect((await oldManager.ensure(requirement())).action).toBe('upgrade');
    expect(old.calls.update).toBe(1);

    const newer = adapter(details({ version: 2 }));
    const newerManager = new SharedResourceStackManager({ adapter: newer.value, pollIntervalMs: 0 });
    expect((await newerManager.ensure(requirement())).action).toBe('reuse');
    expect(newer.calls.update).toBe(0);
  });

  test('fails closed for a foreign deterministic stack', async () => {
    const fake = adapter(details({ ownershipKey: 'someone-else' }));
    const manager = new SharedResourceStackManager({ adapter: fake.value, pollIntervalMs: 0 });
    await expect(manager.ensure(requirement())).rejects.toMatchObject({ code: 'SHARED_STACK_FOREIGN' });
  });

  test('lets the provider merge monotonic inputs and reject conflicts', async () => {
    const fake = adapter(details({ parameters: { HostedZoneId: 'Z1' } }));
    const manager = new SharedResourceStackManager({ adapter: fake.value, pollIntervalMs: 0 });
    const mergeParameters: SharedStackRequirement['mergeParameters'] = ({ desired, existing }) => {
      if (desired.HostedZoneId && existing.HostedZoneId && desired.HostedZoneId !== existing.HostedZoneId) {
        throw new Error('zone conflict');
      }
      return { HostedZoneId: existing.HostedZoneId || desired.HostedZoneId || '' };
    };
    expect((await manager.ensure(requirement({ parameters: { HostedZoneId: '' }, mergeParameters }))).action).toBe(
      'reuse'
    );
    await expect(
      manager.ensure(requirement({ parameters: { HostedZoneId: 'Z2' }, mergeParameters }))
    ).rejects.toMatchObject({ code: 'SHARED_STACK_PARAMETER_MERGE_FAILED' });
  });

  test('deduplicates matching requirements and rejects conflicting definitions', async () => {
    const fake = adapter(details());
    const manager = new SharedResourceStackManager({ adapter: fake.value, pollIntervalMs: 0 });
    expect(await manager.ensureAll([requirement(), requirement()])).toHaveLength(1);
    await expect(manager.ensureAll([requirement(), requirement({ ownershipKey: 'different' })])).rejects.toMatchObject({
      code: 'SHARED_STACK_DEFINITION_CONFLICT'
    });
  });

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
    const fake = adapter(details({ status: 'UPDATE_IN_PROGRESS' }));
    const manager = new SharedResourceStackManager({
      adapter: fake.value,
      maxWaitMs: 2,
      pollIntervalMs: 1,
      wait: async () => {}
    });
    await expect(manager.ensure(requirement())).rejects.toThrow('Timed out');
    await expect(manager.ensure(requirement())).rejects.toMatchObject({ code: 'SHARED_STACK_WAIT_TIMEOUT' });
  });

  test('checks the stored CloudFormation role only before mutation', async () => {
    const reused = adapter(details({ roleArn: 'arn:aws:iam::123456789012:role/existing' }));
    const reusedManager = new SharedResourceStackManager({ adapter: reused.value, pollIntervalMs: 0 });
    expect(
      (await reusedManager.ensure(requirement({ roleArn: 'arn:aws:iam::123456789012:role/different-request' }))).action
    ).toBe('reuse');

    const mismatched = adapter(details({ roleArn: 'arn:aws:iam::123456789012:role/existing', version: 0 }));
    const mismatchedManager = new SharedResourceStackManager({ adapter: mismatched.value, pollIntervalMs: 0 });
    await expect(
      mismatchedManager.ensure(requirement({ roleArn: 'arn:aws:iam::123456789012:role/different-request' }))
    ).rejects.toMatchObject({ code: 'SHARED_STACK_ROLE_MISMATCH' });
    expect(mismatched.calls.update).toBe(0);

    const newlyRequested = adapter(details({ version: 0 }));
    const newlyRequestedManager = new SharedResourceStackManager({
      adapter: newlyRequested.value,
      pollIntervalMs: 0
    });
    await expect(
      newlyRequestedManager.ensure(requirement({ roleArn: 'arn:aws:iam::123456789012:role/new-request' }))
    ).rejects.toMatchObject({ code: 'SHARED_STACK_ROLE_MISMATCH' });

    const matching = adapter(details({ roleArn: 'arn:aws:iam::123456789012:role/existing', version: 0 }));
    const matchingManager = new SharedResourceStackManager({ adapter: matching.value, pollIntervalMs: 0 });
    expect(
      (await matchingManager.ensure(requirement({ roleArn: 'arn:aws:iam::123456789012:role/existing' }))).action
    ).toBe('upgrade');
  });

  test('wraps unexpected create and update failures with stable codes and causes', async () => {
    const createFailure = new Error('access denied during create');
    const createAdapter: SharedResourceStackAdapter = {
      get: async () => undefined,
      create: async () => {
        throw createFailure;
      },
      update: async () => {}
    };
    const createManager = new SharedResourceStackManager({ adapter: createAdapter, pollIntervalMs: 0 });
    await expect(createManager.ensure(requirement())).rejects.toMatchObject({
      cause: createFailure,
      code: 'SHARED_STACK_CREATE_FAILED'
    });

    const updateFailure = new Error('access denied during update');
    const updateAdapter: SharedResourceStackAdapter = {
      get: async () => details({ version: 0 }),
      create: async () => {},
      update: async () => {
        throw updateFailure;
      }
    };
    const updateManager = new SharedResourceStackManager({ adapter: updateAdapter, pollIntervalMs: 0 });
    await expect(updateManager.ensure(requirement())).rejects.toMatchObject({
      cause: updateFailure,
      code: 'SHARED_STACK_UPDATE_FAILED'
    });
  });
});
