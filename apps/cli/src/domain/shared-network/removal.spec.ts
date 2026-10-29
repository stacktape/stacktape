import { describe, expect, test } from 'bun:test';
import { findForeignUse, removeUnusedSharedNetwork, type SharedNetworkRemovalAws } from './removal';

type FakeStack = {
  StackId: string;
  StackName: string;
  StackStatus: string;
  StackStatusReason?: string;
  Outputs: Array<{ OutputKey: string; OutputValue: string; ExportName?: string }>;
  physicalIds: string[];
};

const natStack = (): FakeStack => ({
  StackId: 'arn:nat/1',
  StackName: 'stacktape-network-nat',
  StackStatus: 'CREATE_COMPLETE',
  Outputs: [
    { OutputKey: 'ResourceKind', OutputValue: 'shared-network-nat' },
    { OutputKey: 'NatId', OutputValue: 'eni-nat', ExportName: 'stacktape-network-nat' }
  ],
  physicalIds: ['eni-nat', 'sg-nat']
});
const networkStack = (): FakeStack => ({
  StackId: 'arn:network/1',
  StackName: 'stacktape-network',
  StackStatus: 'CREATE_COMPLETE',
  Outputs: [
    { OutputKey: 'ResourceKind', OutputValue: 'shared-network' },
    { OutputKey: 'VpcId', OutputValue: 'vpc-1', ExportName: 'stacktape-network-vpc-id' },
    { OutputKey: 'PrivateSubnetIds', OutputValue: 'subnet-1', ExportName: 'stacktape-network-private-subnet-ids' }
  ],
  physicalIds: ['vpc-1', 'subnet-1', 'rtb-1', 'igw-1', 'vpce-1']
});

/**
 * An account in which CloudFormation deletes a stack on the poll after the request, cancels the delete of a stack whose
 * export is imported, and keeps imports until the importer is gone.
 */
const createAccount = ({
  stacks,
  imports = {},
  interfaces = [] as Array<{ NetworkInterfaceId: string; Groups?: Array<{ GroupId: string }>; Description?: string }>
}: {
  stacks: FakeStack[];
  imports?: Record<string, string[]>;
  interfaces?: Array<{ NetworkInterfaceId: string; Groups?: Array<{ GroupId: string }>; Description?: string }>;
}) => {
  const live = new Map(stacks.map((stack) => [stack.StackName, stack]));
  const deleted = new Map<string, FakeStack>();
  const calls: string[] = [];
  const importers = (stack: FakeStack) =>
    stack.Outputs.flatMap(({ ExportName }) => (ExportName ? (imports[ExportName] ?? []) : [])).filter((name) =>
      live.has(name)
    );
  const pendingDeletes = new Set<string>();
  const tick = () => {
    for (const name of pendingDeletes) {
      const stack = live.get(name);
      if (!stack) continue;
      live.delete(name);
      deleted.set(stack.StackId, { ...stack, StackStatus: 'DELETE_COMPLETE' });
    }
    pendingDeletes.clear();
  };
  const find = (nameOrId: string) =>
    live.get(nameOrId) ?? [...live.values()].find(({ StackId }) => StackId === nameOrId) ?? deleted.get(nameOrId);
  const aws: SharedNetworkRemovalAws = {
    getStack: async (nameOrId) => find(nameOrId),
    listImports: async (exportName) => (imports[exportName] ?? []).filter((name) => live.has(name)),
    listPhysicalIds: async (stackName) => live.get(stackName)?.physicalIds ?? [],
    setTerminationProtection: async (stackId, enabled) => {
      calls.push(`protection ${find(stackId)?.StackName} ${enabled}`);
    },
    deleteStack: async (stackId) => {
      const stack = find(stackId);
      calls.push(`delete ${stack?.StackName}`);
      if (!stack || stack.StackStatus === 'DELETE_COMPLETE') return;
      const users = importers(stack);
      if (users.length) {
        stack.StackStatusReason = `Delete canceled. Cannot delete export as it is in use by ${users[0]}.`;
        return;
      }
      stack.StackStatus = 'DELETE_IN_PROGRESS';
      pendingDeletes.add(stack.StackName);
    },
    describeVpc: async () => ({
      interfaces,
      subnets: [{ SubnetId: 'subnet-1' }],
      securityGroups: [
        { GroupId: 'sg-default', GroupName: 'default' },
        ...(live.has('stacktape-network-nat') ? [{ GroupId: 'sg-nat', GroupName: 'nat' }] : [])
      ],
      routeTables: [
        { RouteTableId: 'rtb-main', Associations: [{ Main: true }], Routes: [{ GatewayId: 'local' }] },
        {
          RouteTableId: 'rtb-1',
          Routes: [
            { GatewayId: 'local', DestinationCidrBlock: '10.231.0.0/16' },
            { GatewayId: 'vpce-1', DestinationPrefixListId: 'pl-1' },
            ...(live.has('stacktape-network-nat')
              ? [{ NetworkInterfaceId: 'eni-nat', DestinationCidrBlock: '0.0.0.0/0' }]
              : [])
          ]
        }
      ],
      endpoints: [{ VpcEndpointId: 'vpce-1', ServiceName: 'com.amazonaws.eu-west-1.s3' }]
    })
  };
  return { aws, calls, live, tick };
};

const run = async (account: ReturnType<typeof createAccount>, onWait?: () => void) => {
  const messages: string[] = [];
  await removeUnusedSharedNetwork({
    aws: account.aws,
    report: { info: (message) => messages.push(message), warn: (message) => messages.push(`WARN ${message}`) },
    pollIntervalMs: 1,
    wait: async () => {
      onWait?.();
      account.tick();
    }
  });
  return messages;
};

describe('removing the shared network after a stage delete', () => {
  test('keeps both stacks while another stage imports the NAT', async () => {
    const account = createAccount({
      stacks: [
        natStack(),
        networkStack(),
        { ...natStack(), StackId: 'arn:b', StackName: 'app-dev-b', Outputs: [], physicalIds: [] }
      ],
      imports: {
        'stacktape-network-nat': ['app-dev-b'],
        'stacktape-network-vpc-id': ['app-dev-b', 'stacktape-network-nat']
      }
    });
    const messages = await run(account);
    expect(account.calls).toEqual([]);
    expect(messages).toEqual(['Kept the shared NAT `stacktape-network-nat`: the stack `app-dev-b` still uses it.']);
  });

  test('waits for the last stage that is still being deleted, then removes the NAT and then the network', async () => {
    const stage = {
      ...natStack(),
      StackId: 'arn:a',
      StackName: 'app-dev-a',
      StackStatus: 'DELETE_IN_PROGRESS',
      Outputs: [],
      physicalIds: []
    };
    const account = createAccount({
      stacks: [natStack(), networkStack(), stage],
      imports: {
        'stacktape-network-nat': ['app-dev-a'],
        'stacktape-network-vpc-id': ['app-dev-a', 'stacktape-network-nat']
      }
    });
    let polls = 0;
    const messages = await run(account, () => {
      // The stage's background delete finishes after a few polls.
      if (++polls === 3) account.live.delete('app-dev-a');
    });
    expect(account.calls).toEqual([
      'protection stacktape-network-nat false',
      'delete stacktape-network-nat',
      'protection stacktape-network false',
      'delete stacktape-network'
    ]);
    expect(messages[0]).toContain('Waiting for AWS to finish deleting `app-dev-a`');
    expect(messages.slice(1)).toEqual([
      'Removed the shared NAT `stacktape-network-nat`: no stage uses it any more.',
      'Removed the shared network `stacktape-network`: no stage uses it any more.'
    ]);
  });

  test('keeps the stacks when the delete of the last stage failed', async () => {
    const stage = {
      ...natStack(),
      StackId: 'arn:a',
      StackName: 'app-dev-a',
      StackStatus: 'DELETE_FAILED',
      Outputs: [],
      physicalIds: []
    };
    const account = createAccount({
      stacks: [natStack(), networkStack(), stage],
      imports: { 'stacktape-network-nat': ['app-dev-a'] }
    });
    const messages = await run(account);
    expect(account.calls).toEqual([]);
    expect(messages[0]).toContain('the delete of `app-dev-a` failed');
  });

  test('keeps the network when its VPC holds a network interface Stacktape did not create', async () => {
    const account = createAccount({
      stacks: [networkStack()],
      interfaces: [{ NetworkInterfaceId: 'eni-user', Groups: [{ GroupId: 'sg-user' }], Description: 'my bastion' }]
    });
    const messages = await run(account);
    expect(account.calls).toEqual([]);
    expect(messages).toEqual([
      'Kept the shared network `stacktape-network`: its VPC vpc-1 holds resources Stacktape did not create: network interface eni-user (my bastion). Remove them to have it removed with the next stage delete.'
    ]);
  });

  test("counts the NAT instance's own interface as Stacktape's", async () => {
    const account = createAccount({
      stacks: [natStack(), networkStack()],
      interfaces: [
        { NetworkInterfaceId: 'eni-nat', Groups: [{ GroupId: 'sg-nat' }] },
        { NetworkInterfaceId: 'eni-instance', Groups: [{ GroupId: 'sg-nat' }] }
      ]
    });
    const messages = await run(account);
    expect(messages[0]).toBe('Removed the shared NAT `stacktape-network-nat`: no stage uses it any more.');
  });

  test('turns protection on again when CloudFormation cancels the delete because a deploy started using the stack', async () => {
    const account = createAccount({ stacks: [natStack(), networkStack()] });
    // A deploy imported the NAT just before the delete arrived; CloudFormation cancels it at once.
    account.aws.deleteStack = async (stackId) => {
      const stack = await account.aws.getStack(stackId);
      account.calls.push(`delete ${stack?.StackName}`);
      if (stack) stack.StackStatusReason = 'Delete canceled. Cannot delete export as it is in use by app-dev-c.';
    };
    const messages = await run(account);
    expect(account.calls).toEqual([
      'protection stacktape-network-nat false',
      'delete stacktape-network-nat',
      'protection stacktape-network-nat true'
    ]);
    expect(messages).toEqual([
      'Kept the shared NAT `stacktape-network-nat`: a stage started using it while it was being removed.'
    ]);
  });

  test('waits for a removal another stage delete started instead of starting its own', async () => {
    const account = createAccount({
      stacks: [{ ...natStack(), StackStatus: 'DELETE_IN_PROGRESS' }, networkStack()]
    });
    let polls = 0;
    const messages = await run(account, () => {
      if (++polls === 2) account.live.delete('stacktape-network-nat');
    });
    expect(account.calls).toEqual(['protection stacktape-network false', 'delete stacktape-network']);
    expect(messages).toEqual([
      'Removed the shared NAT `stacktape-network-nat`: no stage uses it any more.',
      'Removed the shared network `stacktape-network`: no stage uses it any more.'
    ]);
  });

  test('never deletes a stack under the name that Stacktape did not create', async () => {
    const account = createAccount({
      stacks: [{ ...networkStack(), Outputs: [{ OutputKey: 'VpcId', OutputValue: 'vpc-9' }] }]
    });
    const messages = await run(account);
    expect(account.calls).toEqual([]);
    expect(messages).toEqual(['Kept the shared network `stacktape-network`: it is not a stack Stacktape created.']);
  });
});

describe('foreign use of the shared VPC', () => {
  test('reports what Stacktape did not create, and ignores the default group and the main route table', () => {
    expect(
      findForeignUse({
        owned: new Set(['subnet-1', 'rtb-1', 'igw-1', 'vpce-1']),
        contents: {
          interfaces: [],
          subnets: [{ SubnetId: 'subnet-1' }, { SubnetId: 'subnet-9' }],
          securityGroups: [
            { GroupId: 'sg-default', GroupName: 'default' },
            { GroupId: 'sg-9', GroupName: 'mine' }
          ],
          routeTables: [
            { RouteTableId: 'rtb-main', Associations: [{ Main: true }] },
            { RouteTableId: 'rtb-9', Associations: [] },
            {
              RouteTableId: 'rtb-1',
              Routes: [
                { GatewayId: 'local', DestinationCidrBlock: '10.231.0.0/16' },
                { GatewayId: 'igw-1', DestinationCidrBlock: '0.0.0.0/0' },
                { VpcPeeringConnectionId: 'pcx-9', DestinationCidrBlock: '10.9.0.0/16' }
              ]
            }
          ],
          endpoints: [
            { VpcEndpointId: 'vpce-1', ServiceName: 's3' },
            { VpcEndpointId: 'vpce-9', ServiceName: 'com.amazonaws.eu-west-1.ecr.api' }
          ]
        }
      })
    ).toEqual([
      'subnet subnet-9',
      'security group sg-9 (mine)',
      'route table rtb-9',
      'route to 10.9.0.0/16 through pcx-9 in route table rtb-1',
      'VPC endpoint vpce-9 (com.amazonaws.eu-west-1.ecr.api)'
    ]);
  });
});
