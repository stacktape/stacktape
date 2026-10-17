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
