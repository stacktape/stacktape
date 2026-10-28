import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { SharedStackDetails } from '@domain-services/shared-resource-stack-manager';
import { getDevNetworkLeaseParameterPrefix } from '@stacktape/naming/shared-stacks';
import {
  deleteDevNetwork,
  deleteFailedDevNetwork,
  ensureDevNetwork,
  FAILED_DEV_NETWORK_RECOVERY,
  readDevNetwork,
  readFailedDevNetwork,
  type DevNetwork,
  type DevNetworkAws,
  type LiveDevSession
} from './index';
import { encodeRelayForUserData } from './boot-script';
import { DEV_BOX_RELAY_SOURCE } from './relay-source';
import { buildDevNetworkTemplate, DEV_NETWORK_CONTRACT_VERSION, DEV_NETWORK_KIND } from './template';

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
  KeeperFunctionName: network.keeperFunctionName,
  BoxInstanceProfileName: 'stacktape-dev-network-box-profile'
};
const stackIn = (StackStatus: string, StackId = 'stack-1'): SharedStackDetails => ({
  StackId,
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
  /**
   * The stack status of each read; the last one repeats. `undefined` is a stack that does not exist, and `new:<status>`
   * a stack another session created under the same name.
   */
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
        if (created) return stackIn('CREATE_COMPLETE', 'stack-2');
        const status = statuses[Math.min(read++, statuses.length - 1)];
        if (status?.startsWith('new:')) return stackIn(status.slice('new:'.length), 'stack-2');
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
      },
      listResources: async () => []
    },
    resolveBoxImageId: async () => 'ami-1',
    describeBox: async () => ({ state: boxState, hasInstanceProfile: true }),
    startBox: async () => {},
    attachBoxProfile: async () => {},
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
      deletedLeases: 1,
      recreated: false
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

  test('ends when a session creates a new network under the same name, and keeps the leases it may use', async () => {
    const { aws, calls, leases } = fakeAws({
      statuses: ['CREATE_COMPLETE', 'CREATE_COMPLETE', 'DELETE_IN_PROGRESS', 'new:CREATE_IN_PROGRESS']
    });
    expect(await deleteDevNetwork({ aws, network, findLiveSessions: noSessions, pollIntervalMs: 1 })).toEqual({
      deletedLeases: 0,
      recreated: true
    });
    expect({ deletes: calls.deletes, leases: leases.size }).toEqual({ deletes: 1, leases: 1 });
  });

  test('a long deletion reports what it waits for, Lambda network interfaces included', async () => {
    const { aws } = fakeAws({
      statuses: ['CREATE_COMPLETE', 'CREATE_COMPLETE', 'DELETE_IN_PROGRESS', 'DELETE_IN_PROGRESS', undefined]
    });
    const listings = [
      [{ LogicalResourceId: 'Box', ResourceStatus: 'DELETE_IN_PROGRESS' }],
      [
        { LogicalResourceId: 'PrivateSubnet0', ResourceStatus: 'DELETE_IN_PROGRESS' },
        { LogicalResourceId: 'Vpc', ResourceStatus: 'CREATE_COMPLETE' }
      ]
    ];
    aws.stacks.listResources = async () => listings.shift() ?? [];
    const progress: Array<{ deleting: string[]; waitingForLambdaNetworkInterfaces: boolean }> = [];
    await deleteDevNetwork({
      aws,
      network,
      findLiveSessions: noSessions,
      pollIntervalMs: 1,
      onWaiting: ({ deleting, waitingForLambdaNetworkInterfaces }) =>
        progress.push({ deleting, waitingForLambdaNetworkInterfaces })
    });
    expect(progress).toEqual([
      { deleting: ['Box'], waitingForLambdaNetworkInterfaces: false },
      { deleting: ['PrivateSubnet0'], waitingForLambdaNetworkInterfaces: true }
    ]);
  });

  test('a deletion that runs already is waited for, not started again', async () => {
    const { aws, calls, leases } = fakeAws({ statuses: ['DELETE_IN_PROGRESS', 'DELETE_IN_PROGRESS', undefined] });
    await deleteDevNetwork({ aws, network, findLiveSessions: noSessions, pollIntervalMs: 1 });
    expect(calls.deletes).toBe(0);
    expect(leases.size).toBe(0);
  });
});

describe('dev network creation during a deletion', () => {
  test('a network another session created meanwhile ends the wait', async () => {
    const { aws, calls } = fakeAws({ statuses: ['DELETE_IN_PROGRESS', 'new:CREATE_COMPLETE'] });
    const { action } = await ensureDevNetwork({ aws, onCreate: () => {}, pollIntervalMs: 1 });
    expect({ action, creates: calls.creates }).toEqual({ action: 'reuse', creates: 0 });
  });

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

const KEEPER_FAILED = 'The following resource(s) failed to create: [Keeper].';

/**
 * A creation as CloudFormation runs it: the stack is in progress without outputs, its box exists minutes before the
 * keeper, and it ends complete or is deleted again after a failure. The test moves it from phase to phase.
 */
const creatingAws = () => {
  let phase: 'absent' | 'creating' | 'box' | 'complete' | 'rolling-back' | 'deleted' = 'absent';
  const attached: string[] = [];
  const counts = { resourceReads: 0 };
  const { aws: base } = fakeAws({ statuses: [undefined] });
  const created = (LogicalResourceId: string, PhysicalResourceId: string) => ({
    LogicalResourceId,
    PhysicalResourceId,
    ResourceStatus: 'CREATE_COMPLETE'
  });
  const aws: DevNetworkAws = {
    ...base,
    stacks: {
      ...base.stacks,
      get: async () => {
        if (phase === 'absent' || phase === 'deleted') return undefined;
        if (phase === 'complete') return stackIn('CREATE_COMPLETE');
        if (phase === 'rolling-back') {
          return { ...stackIn('DELETE_IN_PROGRESS'), Outputs: [], StackStatusReason: KEEPER_FAILED };
        }
        return { ...stackIn('CREATE_IN_PROGRESS'), Outputs: [] };
      },
      create: async () => void (phase = 'creating'),
      listResources: async () => {
        counts.resourceReads++;
        const resources = [
          created('Vpc', network.vpcId),
          created('PrivateSubnet0', network.privateSubnetIds[0]),
          created('PrivateSubnet1', network.privateSubnetIds[1]),
          created('LambdaSecurityGroup', network.lambdaSecurityGroupId),
          { LogicalResourceId: 'Keeper', ResourceStatus: 'CREATE_IN_PROGRESS' }
        ];
        if (phase === 'box') resources.push(created('Box', network.boxInstanceId));
        else resources.push({ LogicalResourceId: 'Box', PhysicalResourceId: '', ResourceStatus: 'CREATE_IN_PROGRESS' });
        return resources;
      }
    },
    describeBox: async () => ({
      state: 'running',
      privateIp: network.boxPrivateIp,
      hasInstanceProfile: attached.length > 0
    }),
    attachBoxProfile: async (instanceId, name) => void attached.push(`${instanceId}:${name}`)
  };
  return { aws, attached, counts, setPhase: (next: typeof phase) => (phase = next) };
};

describe('dev network creation', () => {
  test('returns the network once its box exists, and is ready once CloudFormation finished and the profile is attached', async () => {
    const { aws, attached, setPhase } = creatingAws();
    const pending = ensureDevNetwork({ aws, onCreate: () => {}, pollIntervalMs: 1 });
    await delay(20);
    setPhase('box');
    const { network: early, action, ready } = await pending;
    expect({ action, early }).toEqual({ action: 'create', early: network });
    let readyNow = false;
    void ready.then(() => (readyNow = true));
    await delay(20);
    expect({ readyNow, attached }).toEqual({ readyNow: false, attached: [] });
    setPhase('complete');
    await ready;
    expect(attached).toEqual([`${network.boxInstanceId}:stacktape-dev-network-box-profile`]);
  });

  test('a creation that fails after the box exists rejects `ready` at once, not when the rollback ends', async () => {
    const { aws, setPhase } = creatingAws();
    const pending = ensureDevNetwork({ aws, onCreate: () => {}, pollIntervalMs: 1 });
    await delay(20);
    setPhase('box');
    const { ready } = await pending;
    // The rollback never ends here, like one that network interfaces of dev functions block for an hour.
    setPhase('rolling-back');
    const error = await ready.then(
      () => undefined,
      (caught: { code?: string; message?: string; hints?: string[] }) => caught
    );
    expect(error?.code).toBe('DEV_NETWORK_CREATE_FAILED');
    expect(error?.message).toContain(`DELETE_IN_PROGRESS: ${KEEPER_FAILED}`);
    expect(error?.hints?.slice(1)).toEqual(FAILED_DEV_NETWORK_RECOVERY);
  });

  test("a session that finds another one's creation continues once the box exists, whether that session still runs or not", async () => {
    const { aws, attached, setPhase } = creatingAws();
    setPhase('creating');
    let joined = 0;
    const pending = ensureDevNetwork({ aws, onCreate: () => {}, onJoinCreation: () => joined++, pollIntervalMs: 1 });
    await delay(20);
    setPhase('box');
    const { network: early, action, ready } = await pending;
    expect({ action, early, joined }).toEqual({ action: 'join', early: network, joined: 1 });
    let readyNow = false;
    void ready.then(() => (readyNow = true));
    await delay(20);
    expect(readyNow).toBe(false);
    // CloudFormation finishes the network on its own; this session attaches the box's profile.
    setPhase('complete');
    await ready;
    expect(attached).toEqual([`${network.boxInstanceId}:stacktape-dev-network-box-profile`]);
  });

  test('an existing network is not waited for resource by resource, and gets a missing profile attached', async () => {
    const { aws, attached, counts, setPhase } = creatingAws();
    setPhase('complete');
    const { action, ready } = await ensureDevNetwork({ aws, onCreate: () => {}, pollIntervalMs: 1 });
    await ready;
    expect({ action, resourceReads: counts.resourceReads, attached: attached.length }).toEqual({
      action: 'reuse',
      resourceReads: 0,
      attached: 1
    });
  });
});

/**
 * A network whose creation failed after dev functions used its subnets: CloudFormation could not delete it again, so
 * it is in DELETE_FAILED with no outputs. After a deletion call the stack reads `afterDelete`, one status per read.
 */
const failedAws = ({
  functions = [] as string[],
  tagged = true,
  afterDelete = ['DELETE_FAILED', 'DELETE_IN_PROGRESS', undefined] as Array<string | undefined>
} = {}) => {
  const { aws: base, leases } = fakeAws({ statuses: [undefined] });
  const calls = { deletes: 0 };
  let read = 0;
  const failedStack = (StackStatus: string): SharedStackDetails => ({
    StackId: 'stack-1',
    StackName: stackName,
    StackStatus,
    StackStatusReason: 'The following resource(s) failed to delete: [PrivateSubnet0, LambdaSecurityGroup].',
    Outputs: [],
    Tags: tagged ? [{ Key: 'stacktape:shared-resource-kind', Value: 'dev-network' }] : []
  });
  const aws: DevNetworkAws = {
    ...base,
    stacks: {
      ...base.stacks,
      get: async () => {
        if (!calls.deletes) return failedStack('DELETE_FAILED');
        const status = afterDelete[Math.min(read++, afterDelete.length - 1)];
        return status ? failedStack(status) : undefined;
      },
      delete: async () => void calls.deletes++,
      listResources: async () => [
        { LogicalResourceId: 'LambdaSecurityGroup', PhysicalResourceId: 'sg-failed', ResourceStatus: 'CREATE_COMPLETE' }
      ]
    },
    listFunctionsInSecurityGroup: async (groupId) => (groupId === 'sg-failed' ? functions : [])
  };
  return { aws, calls, leases };
};

describe('a network whose creation failed', () => {
  test("a session that waited for another one's creation gets the recovery steps as soon as it fails", async () => {
    let reads = 0;
    const { aws: base } = failedAws();
    const states = ['CREATE_IN_PROGRESS', 'CREATE_IN_PROGRESS', 'DELETE_IN_PROGRESS', 'DELETE_FAILED'];
    const aws: DevNetworkAws = {
      ...base,
      stacks: {
        ...base.stacks,
        get: async () => ({
          ...(await base.stacks.get(stackName))!,
          StackStatus: states[Math.min(reads++, states.length - 1)]
        })
      }
    };
    const error = await ensureDevNetwork({ aws, onCreate: () => {}, pollIntervalMs: 1 }).then(
      () => undefined,
      (caught: { code?: string; hints?: string[] }) => caught
    );
    // The rollback (DELETE_IN_PROGRESS) is not waited for.
    expect(error).toMatchObject({ code: 'DEV_NETWORK_CREATE_FAILED' });
    expect(error?.hints?.[0]).toContain('Another `stacktape dev` session created it');
    expect(error?.hints?.slice(1)).toEqual(FAILED_DEV_NETWORK_RECOVERY);
  });

  test('every command that meets it gives the order that works, instead of pointing at another dead end', async () => {
    const { aws } = failedAws();
    expect(await readFailedDevNetwork(aws)).toMatchObject({ stackName, status: 'DELETE_FAILED' });
    for (const attempt of [readDevNetwork(aws), ensureDevNetwork({ aws, onCreate: () => {}, pollIntervalMs: 1 })]) {
      const error = (await failure(attempt)) as { code?: string } | undefined;
      expect(error?.code).toMatch(/^DEV_NETWORK_(CREATION|DELETE)_FAILED$/);
      const hints = await attempt.catch((caught: { hints?: string[] }) => caught.hints);
      expect(hints).toEqual(FAILED_DEV_NETWORK_RECOVERY);
    }
  });

  test('is deleted by its stack name once no dev function uses it, and its leases go too', async () => {
    const used = failedAws({ functions: ['shop-dev-api', `${stackName}-keeper`] });
    const refused = await deleteFailedDevNetwork({
      aws: used.aws,
      failed: (await readFailedDevNetwork(used.aws))!
    }).then(
      () => undefined,
      (caught: { code?: string; message?: string; hints?: string[] }) => caught
    );
    expect(refused).toMatchObject({ code: 'DEV_NETWORK_IN_USE', hints: FAILED_DEV_NETWORK_RECOVERY });
    expect(refused?.message).toContain('shop-dev-api');
    expect(refused?.message).not.toContain('keeper');
    expect(used.calls.deletes).toBe(0);

    // The first read after the deletion call still shows DELETE_FAILED; that is not the deletion failing again.
    const free = failedAws();
    const failed = (await readFailedDevNetwork(free.aws))!;
    expect(await deleteFailedDevNetwork({ aws: free.aws, failed, pollIntervalMs: 1 })).toEqual({
      deletedLeases: 1,
      recreated: false
    });
    expect({ deletes: free.calls.deletes, leases: free.leases.size }).toEqual({ deletes: 1, leases: 0 });
  });

  test('a deletion that fails again says to wait for Lambda, and a stack Stacktape does not own is left alone', async () => {
    const again = failedAws({ afterDelete: ['DELETE_IN_PROGRESS', 'DELETE_FAILED'] });
    const error = await deleteFailedDevNetwork({
      aws: again.aws,
      failed: (await readFailedDevNetwork(again.aws))!,
      pollIntervalMs: 1
    }).catch((caught: { code?: string; hints?: string[] }) => caught);
    expect(error).toMatchObject({ code: 'DEV_NETWORK_DELETE_FAILED' });
    expect(String((error as { hints?: string[] }).hints)).toContain('Lambda releases the network interfaces');

    const foreign = failedAws({ tagged: false });
    expect(
      await failure(deleteFailedDevNetwork({ aws: foreign.aws, failed: (await readFailedDevNetwork(foreign.aws))! }))
    ).toMatchObject({ code: 'DEV_NETWORK_FOREIGN' });
    expect(foreign.calls.deletes).toBe(0);
  });
});

// Review of #388: the relay changed to version 4 while the network contract stayed at 4, so no existing network was
// updated and its box kept the old relay.
describe('a network of an older contract', () => {
  test('is updated once, for example to install a new relay on its box', async () => {
    const { aws, calls } = fakeAws({ statuses: ['CREATE_COMPLETE'] });
    const get = aws.stacks.get;
    let updated = false;
    aws.stacks.get = async (name) => {
      const stack = await get(name);
      if (!stack || updated) return stack;
      return {
        ...stack,
        Outputs: stack.Outputs!.map((output) =>
          output.OutputKey === 'ContractVersion' ? { ...output, OutputValue: '4' } : output
        )
      };
    };
    const update = aws.stacks.update;
    aws.stacks.update = async (input) => {
      updated = true;
      return update(input);
    };
    const { action, ready } = await ensureDevNetwork({ aws, onCreate: () => {}, pollIntervalMs: 1 });
    await ready;
    expect({ action, updates: calls.updates }).toEqual({ action: 'upgrade', updates: 1 });
  });

  test('the template a contract version stands for does not change without a new version', () => {
    // Changing the template, the relay or the boot script included, changes this hash: increment
    // DEV_NETWORK_CONTRACT_VERSION, so existing networks are updated, then record the new pair here.
    // The relay is hashed as source: its gzip encoding in the user data may differ between zlib versions.
    const encodedRelay = JSON.stringify(encodeRelayForUserData(DEV_BOX_RELAY_SOURCE)).slice(1, -1);
    const template = JSON.stringify(buildDevNetworkTemplate({ networkName: stackName }));
    expect(template).toContain(encodedRelay);
    const hash = createHash('sha256')
      .update(template.replace(encodedRelay, ''))
      .update(DEV_BOX_RELAY_SOURCE)
      .digest('hex')
      .slice(0, 16);
    expect({ contract: DEV_NETWORK_CONTRACT_VERSION, hash }).toEqual({ contract: 5, hash: '6ca336e00cd5bfbb' });
  });
});
