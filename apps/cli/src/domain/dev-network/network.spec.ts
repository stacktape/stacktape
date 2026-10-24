import { describe, expect, test } from 'bun:test';
import type { SharedStackDetails } from '@domain-services/shared-resource-stack-manager';
import { getDevNetworkLeaseParameterPrefix } from '@stacktape/naming/shared-stacks';
import { deleteDevNetwork, ensureDevNetwork, type DevNetwork, type DevNetworkAws, type LiveDevSession } from './index';
import { DEV_NETWORK_CONTRACT_VERSION, DEV_NETWORK_KIND } from './template';

// CloudFormation, EC2 and SSM as the network commands see them: a stack whose status moves on each read, a box state,
// and lease parameters. Stack operations from other machines are scripted as status sequences.

const stackName = 'stacktape-dev-network';
const network: DevNetwork = {
  stackName,
  vpcId: 'vpc-1',
  privateSubnetIds: ['subnet-a', 'subnet-b'],
  lambdaSecurityGroupId: 'sg-1',
  boxInstanceId: 'i-box',
  boxPrivateIp: '10.230.0.10',
  keeperFunctionName: `${stackName}-keeper`
};
const outputs = {
  ResourceKind: DEV_NETWORK_KIND,
  OwnershipKey: stackName,
  ContractVersion: String(DEV_NETWORK_CONTRACT_VERSION),
  VpcId: network.vpcId,
  PrivateSubnetIds: network.privateSubnetIds.join(','),
  LambdaSecurityGroupId: network.lambdaSecurityGroupId,
  BoxInstanceId: network.boxInstanceId,
  BoxPrivateIp: network.boxPrivateIp,
  KeeperFunctionName: network.keeperFunctionName
};
const stackIn = (StackStatus: string): SharedStackDetails => ({
  StackName: stackName,
  StackStatus,
  Parameters: [{ ParameterKey: 'ImageId', ParameterValue: 'ami-1' }],
  Outputs: Object.entries(outputs).map(([OutputKey, OutputValue]) => ({ OutputKey, OutputValue }))
});

const fakeAws = ({
  statuses,
  boxState = 'stopped',
  functions = [network.keeperFunctionName]
}: {
  /** The stack status of each read; the last one repeats. `undefined` is a stack that does not exist. */
  statuses: Array<string | undefined>;
  boxState?: string;
  functions?: string[];
}) => {
  const calls = { deletes: 0, creates: 0, updates: 0 };
  const leasePrefix = getDevNetworkLeaseParameterPrefix(stackName);
  const leases = new Map([[`${leasePrefix}/shop-alice/db`, '20001']]);
  let read = 0;
  let created = false;
  const aws: DevNetworkAws = {
    stacks: {
      get: async () => {
        if (created) return stackIn('CREATE_COMPLETE');
        const status = statuses[Math.min(read++, statuses.length - 1)];
        return status ? stackIn(status) : undefined;
      },
      create: async () => {
        calls.creates++;
        created = true;
      },
      update: async () => {
        calls.updates++;
      },
      delete: async () => {
        calls.deletes++;
      }
    },
    resolveBoxImageId: async () => 'ami-1',
    describeBox: async () => ({ state: boxState }),
    startBox: async () => {},
    isBoxOnline: async () => true,
    listFunctionsInSecurityGroup: async () => functions,
    leases: {
      list: async (prefix) =>
        [...leases].filter(([name]) => name.startsWith(prefix)).map(([name, value]) => ({ name, value })),
      create: async (name, value) => void leases.set(name, value),
      delete: async (names) => names.forEach((name) => leases.delete(name))
    }
  };
  return { aws, calls, leases };
};

const noSessions = async (): Promise<LiveDevSession[]> => [];
const failure = (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (error: { code?: string; message?: string }) => ({ code: error.code, message: error.message })
  );

describe('dev network delete', () => {
  test('refuses while a session creates or updates the network', async () => {
    for (const status of ['CREATE_IN_PROGRESS', 'UPDATE_IN_PROGRESS']) {
      const { aws, calls } = fakeAws({ statuses: [status] });
      expect(await failure(deleteDevNetwork({ aws, network, findLiveSessions: noSessions }))).toMatchObject({
        code: 'DEV_NETWORK_BUSY'
      });
      expect(calls.deletes).toBe(0);
    }
  });

  test('refuses while sessions run on the box, naming them, unless forced', async () => {
    const live = async () => [{ stack: 'shop-alice', label: 'Alice (alice-laptop)', since: 1_700_000_000 }];
    const refused = fakeAws({ statuses: ['UPDATE_COMPLETE'], boxState: 'running' });
    const error = await failure(deleteDevNetwork({ aws: refused.aws, network, findLiveSessions: live }));
    expect(error).toMatchObject({ code: 'DEV_NETWORK_SESSIONS_LIVE' });
    expect(error?.message).toContain('shop-alice (Alice (alice-laptop)');
    expect(refused.calls.deletes).toBe(0);

    const unknown = fakeAws({ statuses: ['UPDATE_COMPLETE'], boxState: 'pending' });
    const unreachable = async () => {
      throw new Error('the dev box relay did not answer');
    };
    expect(await failure(deleteDevNetwork({ aws: unknown.aws, network, findLiveSessions: unreachable }))).toMatchObject(
      { code: 'DEV_NETWORK_SESSIONS_UNKNOWN' }
    );

    const forced = fakeAws({ statuses: ['UPDATE_COMPLETE', 'UPDATE_COMPLETE', undefined], boxState: 'running' });
    await deleteDevNetwork({ aws: forced.aws, network, force: true, findLiveSessions: live, pollIntervalMs: 1 });
    expect(forced.calls.deletes).toBe(1);
    expect(forced.leases.size).toBe(0);
  });

  test('a stopped box has no sessions to ask; dev functions still refuse even when forced', async () => {
    let asked = false;
    const ask = async () => {
      asked = true;
      return [];
    };
    const stopped = fakeAws({ statuses: ['CREATE_COMPLETE', 'CREATE_COMPLETE', undefined] });
    expect(await deleteDevNetwork({ aws: stopped.aws, network, findLiveSessions: ask, pollIntervalMs: 1 })).toEqual({
      deletedLeases: 1
    });
    expect(asked).toBe(false);

    const used = fakeAws({ statuses: ['CREATE_COMPLETE'], functions: [network.keeperFunctionName, 'shop-alice-api'] });
    expect(
      await failure(deleteDevNetwork({ aws: used.aws, network, force: true, findLiveSessions: noSessions }))
    ).toMatchObject({ code: 'DEV_NETWORK_IN_USE' });
    expect(used.calls.deletes).toBe(0);
  });

  test('an update that starts while the checks run is not cut off', async () => {
    const { aws, calls } = fakeAws({ statuses: ['UPDATE_COMPLETE', 'UPDATE_IN_PROGRESS'] });
    expect(await failure(deleteDevNetwork({ aws, network, findLiveSessions: noSessions }))).toMatchObject({
      code: 'DEV_NETWORK_BUSY'
    });
    expect(calls.deletes).toBe(0);
  });

  test('a deletion that runs already is waited for, not started again', async () => {
    const { aws, calls, leases } = fakeAws({ statuses: ['DELETE_IN_PROGRESS', 'DELETE_IN_PROGRESS', undefined] });
    await deleteDevNetwork({ aws, network, findLiveSessions: noSessions, pollIntervalMs: 1 });
    expect(calls.deletes).toBe(0);
    expect(leases.size).toBe(0);
  });
});

describe('dev network creation during a deletion', () => {
  test('waits for the deletion to end, then creates the network again', async () => {
    const { aws, calls } = fakeAws({ statuses: ['DELETE_IN_PROGRESS', 'DELETE_IN_PROGRESS', undefined] });
    let waited = 0;
    const { action, network: created } = await ensureDevNetwork({
      aws,
      onCreate: () => {},
      onDeletionWait: () => waited++,
      pollIntervalMs: 1
    });
    expect({ action, waited, creates: calls.creates }).toEqual({ action: 'create', waited: 1, creates: 1 });
    expect(created.boxInstanceId).toBe(network.boxInstanceId);
  });

  test('a failed deletion says how to finish it', async () => {
    const { aws, calls } = fakeAws({ statuses: ['DELETE_FAILED'] });
    expect(await failure(ensureDevNetwork({ aws, onCreate: () => {}, pollIntervalMs: 1 }))).toMatchObject({
      code: 'DEV_NETWORK_DELETE_FAILED'
    });
    expect(calls.creates).toBe(0);
  });
});
