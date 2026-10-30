import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JANITOR_FUNCTION_SOURCE } from './janitor-function';

// The janitor's Python source under the Python 3 of this machine, against a fake account: `boto3` and `botocore` are
// replaced by a model in which CloudFormation refuses to delete a protected stack, cancels the delete of a stack whose
// export is imported, and finishes a delete on the next wait. Time is the model's own.

const HARNESS = String.raw`
import json, sys, types
account = json.load(open(sys.argv[1]))
clock = {'now': account.get('now', 1_000_000.0)}
live = {s['StackName']: s for s in account['stacks']}
by_id = {s['StackId']: s for s in account['stacks']}
params = dict(account.get('params', {}))
imports = account.get('imports', {})
calls = []

class ClientError(Exception):
  def __init__(self, code, message):
    super().__init__(message)
    self.response = {'Error': {'Code': code, 'Message': message}}

exceptions = types.ModuleType('botocore.exceptions'); exceptions.ClientError = ClientError
botocore = types.ModuleType('botocore'); botocore.exceptions = exceptions
sys.modules['botocore'] = botocore; sys.modules['botocore.exceptions'] = exceptions

def find(name_or_id):
  return live.get(name_or_id) or by_id.get(name_or_id)

def importers_of(s):
  return [n for o in s.get('Outputs', []) if o.get('ExportName') for n in imports.get(o['ExportName'], []) if n in live]

def run_hooks(op, name):
  for hook in account.get('hooks', []):
    if hook['after'] == op + ' ' + name and not hook.get('done'):
      hook['done'] = True
      for action in hook['do']:
        if 'mark' in action: params['/stacktape/shared-network/' + action['mark'] + '/last-used'] = iso(clock['now'])
        if 'protect' in action: live[action['protect']]['EnableTerminationProtection'] = True
        if 'import' in action: imports.setdefault(action['import'][0], []).append(action['import'][1])

def iso(t):
  from datetime import datetime, timezone
  return datetime.fromtimestamp(t, timezone.utc).isoformat().replace('+00:00', 'Z')

class Paginator:
  def __init__(self, method): self.method = method
  def paginate(self, **kw): return [self.method(**kw)]

class Client:
  def get_paginator(self, op): return Paginator(getattr(self, op))

class CloudFormation(Client):
  def describe_stacks(self, StackName):
    # A deleted stack can be read by its ID only.
    s = live.get(StackName) or (by_id.get(StackName) if StackName.startswith('arn:') else None)
    if not s: raise ClientError('ValidationError', 'Stack with id ' + StackName + ' does not exist')
    return {'Stacks': [{k: v for k, v in s.items() if k != 'resources'}]}
  def list_imports(self, ExportName):
    names = [n for n in imports.get(ExportName, []) if n in live]
    if not names: raise ClientError('ValidationError', 'Export ' + ExportName + ' is not imported by any stack.')
    return {'Imports': names}
  def list_stack_resources(self, StackName):
    s = live.get(StackName)
    if not s: raise ClientError('ValidationError', 'Stack with id ' + StackName + ' does not exist')
    return {'StackResourceSummaries': [{'LogicalResourceId': l, 'PhysicalResourceId': p} for l, p in s.get('resources', {}).items()]}
  def update_termination_protection(self, StackName, EnableTerminationProtection):
    s = find(StackName)
    calls.append('protection ' + s['StackName'] + ' ' + str(EnableTerminationProtection).lower())
    s['EnableTerminationProtection'] = EnableTerminationProtection
    if not EnableTerminationProtection: run_hooks('unprotect', s['StackName'])
  def delete_stack(self, StackName, RoleARN):
    s = find(StackName)
    calls.append('delete ' + s['StackName'] + ' as ' + RoleARN)
    if s.get('EnableTerminationProtection'):
      raise ClientError('ValidationError', 'Stack cannot be deleted while TerminationProtection is enabled')
    users = importers_of(s)
    if users:
      s['StackStatusReason'] = 'Delete canceled. Cannot delete export as it is in use by ' + users[0] + '.'
      return
    if account.get('failDelete'):
      s['StackStatus'] = 'DELETE_FAILED'; return
    s['StackStatus'] = 'DELETE_IN_PROGRESS'
  def describe_stack_resources(self, StackName):
    return {'StackResources': account.get('stackResources', [])}

class Ec2(Client):
  def _vpc(self, key):
    items = account.get('vpc', {}).get(key, [])
    if 'stacktape-network-nat' in live: return items
    # The NAT's group, interfaces and default routes go with its stack.
    nat = lambda item: 'sg-nat' in json.dumps(item) or 'eni-nat' in json.dumps(item)
    if key == 'routeTables': return [dict(t, Routes=[r for r in t.get('Routes', []) if not nat(r)]) for t in items]
    return [item for item in items if not nat(item)]
  def describe_network_interfaces(self, Filters):
    items = self._vpc('interfaces')
    for f in Filters:
      if f['Name'] == 'group-id':
        items = [n for n in items if any(g['GroupId'] in f['Values'] for g in n.get('Groups', []))]
    return {'NetworkInterfaces': items}
  def describe_subnets(self, Filters): return {'Subnets': self._vpc('subnets')}
  def describe_security_groups(self, Filters): return {'SecurityGroups': self._vpc('securityGroups')}
  def describe_route_tables(self, Filters): return {'RouteTables': self._vpc('routeTables')}
  def describe_vpc_endpoints(self, Filters): return {'VpcEndpoints': self._vpc('endpoints')}

class Ssm(Client):
  def get_parameter(self, Name):
    if Name not in params: raise ClientError('ParameterNotFound', Name)
    return {'Parameter': {'Value': params[Name]}}
  def put_parameter(self, Name, Value, Type, Overwrite):
    if not Overwrite and Name in params: raise ClientError('ParameterAlreadyExists', Name)
    if Name.endswith('/last-used'): calls.append('mark ' + Name.split('/')[-2])
    params[Name] = Value
  def delete_parameter(self, Name):
    if Name not in params: raise ClientError('ParameterNotFound', Name)
    if Name.endswith('/last-used'): calls.append('unmark ' + Name.split('/')[-2])
    del params[Name]

functions = {name: {'State': state} for name, state in account.get('functions', {}).items()}
lambda_calls = []

class Lambda(Client):
  def get_function(self, FunctionName):
    if FunctionName not in functions: raise ClientError('ResourceNotFoundException', 'Function not found: ' + FunctionName)
    return {'Configuration': {'State': functions[FunctionName]['State']}}
  def create_function(self, FunctionName, Role, VpcConfig, **kw):
    if account.get('roleUnusableFor', 0) > 0:
      account['roleUnusableFor'] -= 1
      lambda_calls.append('refused ' + FunctionName)
      raise ClientError('InvalidParameterValueException', 'The role defined for the function cannot be assumed by Lambda.')
    functions[FunctionName] = {'State': 'Pending'}
    lambda_calls.append('create ' + FunctionName + ' as ' + Role + ' in ' + ','.join(VpcConfig['SubnetIds']) + ' with ' + ','.join(VpcConfig['SecurityGroupIds']))
  def invoke(self, FunctionName, InvocationType, Payload):
    state = functions.get(FunctionName, {}).get('State')
    if state != 'Active': raise ClientError('ResourceConflictException', 'The function is in the state ' + str(state))
    lambda_calls.append('invoke ' + FunctionName)
  def delete_function(self, FunctionName):
    if FunctionName not in functions: raise ClientError('ResourceNotFoundException', 'Function not found: ' + FunctionName)
    del functions[FunctionName]
    lambda_calls.append('delete ' + FunctionName)

clients = {'cloudformation': CloudFormation(), 'ec2': Ec2(), 'ssm': Ssm(), 'lambda': Lambda()}
boto3 = types.ModuleType('boto3'); boto3.client = lambda name: clients[name]
sys.modules['boto3'] = boto3

import time
def sleep(seconds):
  clock['now'] += seconds
  for name, s in list(live.items()):
    if s['StackStatus'] == 'DELETE_IN_PROGRESS' and not account.get('deletesHang'):
      live.pop(name); s['StackStatus'] = 'DELETE_COMPLETE'
time.time = lambda: clock['now']
time.sleep = sleep

import os
os.environ.update({'NETWORK_STACK': 'stacktape-network', 'NAT_STACK': 'stacktape-network-nat', 'ROLE_ARN': 'janitor-role',
                   'UNUSED_SECONDS': '86400', 'PARAMETER_PREFIX': '/stacktape/shared-network', 'STACK_NAME_TAG': 'stp:stack-name'})
sys.path.insert(0, sys.argv[2])
import index
from datetime import datetime as real_datetime
class FakeDatetime(real_datetime):
  @classmethod
  def now(cls, tz=None): return real_datetime.fromtimestamp(clock['now'], tz)
index.datetime = FakeDatetime
logs = []
index.log = logs.append

started = clock['now']
class Context:
  def get_remaining_time_in_millis(self): return 900000 - (clock['now'] - started) * 1000
responses = []
index.respond = lambda event, status, reason='': responses.append([status, reason])
index.handler(account.get('event', {'source': 'aws.events'}), Context())
print(json.dumps({'calls': calls, 'lambda': lambda_calls, 'logs': logs, 'params': sorted(params), 'responses': responses,
                  'stacks': {s['StackName']: s['StackStatus'] for s in by_id.values()},
                  'protection': {n: bool(s.get('EnableTerminationProtection')) for n, s in live.items()}}))
`;

type Stack = {
  StackId: string;
  StackName: string;
  StackStatus: string;
  EnableTerminationProtection?: boolean;
  Outputs: Array<{ OutputKey: string; OutputValue: string; ExportName?: string }>;
  resources: Record<string, string>;
};

type Account = {
  stacks: Stack[];
  imports?: Record<string, string[]>;
  /** Seconds since the last use of each shared stack; absent means no mark. */
  idle?: Partial<Record<'stacktape-network' | 'stacktape-network-nat', number>>;
  vpc?: Record<string, unknown[]>;
  failDelete?: boolean;
  hooks?: Array<{ after: string; do: Array<Record<string, unknown>> }>;
  /** Seconds since another run took the lock; absent means no lock. */
  lockAge?: number;
  /** The invocation; a scheduled run by default. */
  event?: Record<string, unknown>;
  /** CloudFormation never finishes a delete. */
  deletesHang?: boolean;
  /** What DescribeStackResources returns. */
  stackResources?: Array<{ LogicalResourceId: string; ResourceStatus: string }>;
  /** Functions that exist, by name, with their state. */
  functions?: Record<string, string>;
  /** How many creations Lambda refuses because the keepers' new role cannot be assumed yet. */
  roleUnusableFor?: number;
};

const DAY = 86_400;
const NOW = 1_000_000_000;

const natStack = (): Stack => ({
  StackId: 'arn:nat/1',
  StackName: 'stacktape-network-nat',
  StackStatus: 'CREATE_COMPLETE',
  EnableTerminationProtection: true,
  Outputs: [
    { OutputKey: 'ResourceKind', OutputValue: 'shared-network-nat' },
    { OutputKey: 'NatId', OutputValue: 'eni-nat', ExportName: 'stacktape-network-nat-id' }
  ],
  resources: { NetworkInterface: 'eni-nat', SecurityGroup: 'sg-nat' }
});
const networkStack = (): Stack => ({
  StackId: 'arn:network/1',
  StackName: 'stacktape-network',
  StackStatus: 'CREATE_COMPLETE',
  EnableTerminationProtection: true,
  Outputs: [
    { OutputKey: 'ResourceKind', OutputValue: 'shared-network' },
    { OutputKey: 'VpcId', OutputValue: 'vpc-1', ExportName: 'stacktape-network-vpc-id' },
    { OutputKey: 'PrivateSubnetIds', OutputValue: 'subnet-1', ExportName: 'stacktape-network-private-subnet-ids' }
  ],
  resources: {
    Vpc: 'vpc-1',
    PrivateSubnet0: 'subnet-1',
    PublicRouteTable: 'rtb-1',
    InternetGateway: 'igw-1',
    S3GatewayEndpoint: 'vpce-1'
  }
});
/** A network of version 3, with the no-access group and the keepers' role. */
const networkStackV3 = (): Stack => {
  const network = networkStack();
  return {
    ...network,
    Outputs: [
      ...network.Outputs,
      { OutputKey: 'PublicSubnetIds', OutputValue: 'subnet-p0,subnet-p1' },
      {
        OutputKey: 'NoAccessSecurityGroupId',
        OutputValue: 'sg-none',
        ExportName: 'stacktape-network-no-access-security-group-id'
      },
      { OutputKey: 'KeeperRoleArn', OutputValue: 'keeper-role' }
    ],
    resources: { ...network.resources, NoAccessSecurityGroup: 'sg-none' }
  };
};
const PUBLIC_KEEPER = 'stacktape-network-keeper-public';
const PRIVATE_KEEPER = 'stacktape-network-keeper-private';
/** An interface Lambda keeps in the no-access group. */
const noAccessInterface = (id: string) => ({
  NetworkInterfaceId: id,
  Groups: [{ GroupId: 'sg-none' }],
  Description: 'AWS Lambda VPC ENI'
});

const stage = (name: string, resources: Record<string, string> = {}): Stack => ({
  StackId: `arn:${name}`,
  StackName: name,
  StackStatus: 'UPDATE_COMPLETE',
  Outputs: [],
  resources
});

/** What a VPC with the shared stacks holds; `withNat` adds the NAT's group and its default route. */
const sharedVpc = ({
  withNat = true,
  interfaces = [] as unknown[],
  extraRoutes = [] as unknown[]
}: { withNat?: boolean; interfaces?: unknown[]; extraRoutes?: unknown[] } = {}) => ({
  interfaces,
  subnets: [{ SubnetId: 'subnet-1' }],
  securityGroups: [
    { GroupId: 'sg-default', GroupName: 'default' },
    ...(withNat ? [{ GroupId: 'sg-nat', GroupName: 'nat' }] : [])
  ],
  routeTables: [
    { RouteTableId: 'rtb-main', Associations: [{ Main: true }], Routes: [{ GatewayId: 'local' }] },
    {
      RouteTableId: 'rtb-1',
      Routes: [
        { GatewayId: 'local', DestinationCidrBlock: '10.231.0.0/16' },
        { GatewayId: 'vpce-1', DestinationPrefixListId: 'pl-1' },
        ...(withNat ? [{ NetworkInterfaceId: 'eni-nat', DestinationCidrBlock: '0.0.0.0/0' }] : []),
        ...extraRoutes
      ]
    }
  ],
  endpoints: [{ VpcEndpointId: 'vpce-1', ServiceName: 'com.amazonaws.eu-west-1.s3' }]
});

let directory: string;
beforeAll(async () => {
  const python = spawnSync('python3', ['-c', 'import sys; assert sys.version_info >= (3, 11)']);
  if (python.status !== 0) throw new Error('These tests need Python 3.11 or newer as `python3`.');
  directory = await mkdtemp(join(tmpdir(), 'stacktape-janitor-'));
  await mkdir(join(directory, 'function'));
  await writeFile(join(directory, 'function', 'index.py'), JANITOR_FUNCTION_SOURCE);
  await writeFile(join(directory, 'harness.py'), HARNESS);
});
afterAll(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});

let runs = 0;
const runJanitor = async (account: Account) => {
  const iso = (seconds: number) => new Date(seconds * 1000).toISOString();
  const params = Object.fromEntries([
    ...Object.entries(account.idle ?? {}).map(([name, idle]) => [
      `/stacktape/shared-network/${name}/last-used`,
      iso(NOW - (idle as number))
    ]),
    ...(account.lockAge === undefined ? [] : [['/stacktape/shared-network/janitor-lock', iso(NOW - account.lockAge)]])
  ]);
  const file = join(directory, `account-${(runs += 1)}.json`);
  await writeFile(file, JSON.stringify({ ...account, now: NOW, params }));
  const result = spawnSync('python3', [join(directory, 'harness.py'), file, join(directory, 'function')], {
    encoding: 'utf8'
  });
  if (result.status !== 0) throw new Error(result.stderr);
  return JSON.parse(result.stdout) as {
    calls: string[];
    lambda: string[];
    logs: string[];
    params: string[];
    responses: Array<[string, string]>;
    stacks: Record<string, string>;
    protection: Record<string, boolean>;
  };
};

const usedBy = (exportName: string, ...names: string[]) => ({ [exportName]: names });

describe('the shared network janitor', () => {
  test('removes the NAT and then the network once no stage used them for the grace period', async () => {
    const result = await runJanitor({
      stacks: [natStack(), networkStack()],
      imports: usedBy('stacktape-network-vpc-id', 'stacktape-network-nat'),
      idle: { 'stacktape-network-nat': DAY + 1, 'stacktape-network': DAY + 1 },
      vpc: sharedVpc()
    });
    expect(result.calls).toEqual([
      'protection stacktape-network-nat false',
      'delete stacktape-network-nat as janitor-role',
      'unmark stacktape-network-nat',
      'protection stacktape-network false',
      'delete stacktape-network as janitor-role',
      'unmark stacktape-network'
    ]);
    expect(result.stacks).toEqual({
      'stacktape-network-nat': 'DELETE_COMPLETE',
      'stacktape-network': 'DELETE_IN_PROGRESS'
    });
  });

  test('keeps both stacks within the grace period, and marks a stack it sees in use', async () => {
    const result = await runJanitor({
      stacks: [natStack(), networkStack(), stage('app-dev-b')],
      imports: {
        ...usedBy('stacktape-network-nat-id', 'app-dev-b'),
        ...usedBy('stacktape-network-vpc-id', 'app-dev-b', 'stacktape-network-nat')
      },
      idle: { 'stacktape-network-nat': 2 * DAY },
      vpc: sharedVpc()
    });
    expect(result.calls).toEqual(['mark stacktape-network', 'mark stacktape-network-nat']);

    const idle = await runJanitor({
      stacks: [natStack(), networkStack()],
      imports: usedBy('stacktape-network-vpc-id', 'stacktape-network-nat'),
      idle: { 'stacktape-network-nat': DAY - 60, 'stacktape-network': DAY + 1 },
      vpc: sharedVpc()
    });
    expect(idle.calls).toEqual([]);
    expect(idle.logs).toEqual([
      'stacktape-network-nat has no users; it is removed after 60 more seconds without users'
    ]);
  });

  test('runs one at a time, and takes over the lock of a run that died', async () => {
    const account = (lockAge: number): Account => ({
      stacks: [natStack(), networkStack()],
      imports: usedBy('stacktape-network-vpc-id', 'stacktape-network-nat'),
      idle: { 'stacktape-network-nat': DAY + 1, 'stacktape-network': DAY + 1 },
      vpc: sharedVpc(),
      lockAge
    });
    const busy = await runJanitor(account(600));
    expect(busy.calls).toEqual([]);
    expect(busy.logs).toEqual(['Another run is in progress']);

    const stale = await runJanitor(account(1000));
    expect(stale.calls).toContain('delete stacktape-network as janitor-role');
    // The run releases the lock when it ends.
    expect(stale.params).not.toContain('/stacktape/shared-network/janitor-lock');
  });

  test("keeps the network's grace period running from its own last stage while the NAT is kept", async () => {
    const result = await runJanitor({
      stacks: [natStack(), networkStack(), stage('app-dev-b')],
      imports: usedBy('stacktape-network-vpc-id', 'app-dev-b', 'stacktape-network-nat'),
      idle: { 'stacktape-network-nat': 60, 'stacktape-network': 2 * DAY },
      vpc: sharedVpc()
    });
    expect(result.calls).toEqual(['mark stacktape-network']);
  });

  test('starts the grace period of a stack without a mark instead of removing it', async () => {
    const result = await runJanitor({ stacks: [networkStack()], vpc: sharedVpc({ withNat: false }) });
    expect(result.calls).toEqual(['mark stacktape-network']);
    expect(result.stacks['stacktape-network']).toBe('CREATE_COMPLETE');
  });

  test('removes the NAT while a stage without NAT keeps the network, whose interfaces are its own', async () => {
    const result = await runJanitor({
      stacks: [natStack(), networkStack(), stage('app-dev-b', { Group: 'sg-b' })],
      imports: usedBy('stacktape-network-vpc-id', 'app-dev-b', 'stacktape-network-nat'),
      idle: { 'stacktape-network-nat': DAY + 1 },
      vpc: sharedVpc({
        interfaces: [
          { NetworkInterfaceId: 'eni-lambda-b', Groups: [{ GroupId: 'sg-b' }], Description: 'AWS Lambda VPC ENI' }
        ]
      })
    });
    expect(result.calls).toEqual([
      'mark stacktape-network',
      'protection stacktape-network-nat false',
      'delete stacktape-network-nat as janitor-role',
      'unmark stacktape-network-nat',
      'mark stacktape-network'
    ]);
  });

  test('keeps the stacks when the VPC holds something Stacktape did not create', async () => {
    const result = await runJanitor({
      stacks: [networkStack()],
      idle: { 'stacktape-network': DAY + 1 },
      vpc: sharedVpc({
        withNat: false,
        interfaces: [{ NetworkInterfaceId: 'eni-user', Groups: [{ GroupId: 'sg-user' }], Description: 'my bastion' }],
        extraRoutes: [{ GatewayId: 'igw-1', DestinationCidrBlock: '198.51.100.0/24' }]
      })
    });
    expect(result.calls).toEqual([]);
    expect(result.logs).toEqual([
      'Kept stacktape-network: its VPC holds resources Stacktape did not create: network interface eni-user (my bastion); route to 198.51.100.0/24 through igw-1 in route table rtb-1'
    ]);
  });

  test("counts the NAT instance's own interface as Stacktape's, and not another interface in the NAT's group", async () => {
    const natInstance = {
      NetworkInterfaceId: 'eni-instance',
      Groups: [{ GroupId: 'sg-nat' }],
      TagSet: [{ Key: 'stp:stack-name', Value: 'stacktape-network-nat' }]
    };
    const account = (interfaces: unknown[]): Account => ({
      stacks: [natStack(), networkStack()],
      imports: usedBy('stacktape-network-vpc-id', 'stacktape-network-nat'),
      idle: { 'stacktape-network-nat': DAY + 1, 'stacktape-network': DAY + 1 },
      vpc: sharedVpc({ interfaces })
    });
    const own = await runJanitor(
      account([{ NetworkInterfaceId: 'eni-nat', Groups: [{ GroupId: 'sg-nat' }] }, natInstance])
    );
    expect(own.calls).toContain('delete stacktape-network-nat as janitor-role');

    const borrowed = await runJanitor(
      account([natInstance, { NetworkInterfaceId: 'eni-user', Groups: [{ GroupId: 'sg-nat' }] }])
    );
    expect(borrowed.calls).toEqual([]);
    expect(borrowed.logs[0]).toContain('network interface eni-user');
  });

  test('keeps the stack when a deploy marks it as used after protection went off', async () => {
    const result = await runJanitor({
      stacks: [natStack(), networkStack()],
      imports: usedBy('stacktape-network-vpc-id', 'stacktape-network-nat'),
      idle: { 'stacktape-network-nat': DAY + 1, 'stacktape-network': DAY + 1 },
      vpc: sharedVpc(),
      hooks: [{ after: 'unprotect stacktape-network-nat', do: [{ mark: 'stacktape-network-nat' }] }]
    });
    expect(result.calls).toEqual(['protection stacktape-network-nat false', 'protection stacktape-network-nat true']);
    expect(result.logs).toEqual(['Kept stacktape-network-nat: a stage started using it']);
  });

  test('stops when a deploy turned protection on again, and the delete is refused', async () => {
    const hooks = [{ after: 'unprotect stacktape-network-nat', do: [{ protect: 'stacktape-network-nat' }] }];
    const result = await runJanitor({
      stacks: [natStack(), networkStack()],
      imports: usedBy('stacktape-network-vpc-id', 'stacktape-network-nat'),
      idle: { 'stacktape-network-nat': DAY + 1, 'stacktape-network': DAY + 1 },
      vpc: sharedVpc(),
      hooks
    });
    expect(result.calls).toEqual([
      'protection stacktape-network-nat false',
      'delete stacktape-network-nat as janitor-role'
    ]);
    expect(result.stacks['stacktape-network-nat']).toBe('CREATE_COMPLETE');
    expect(result.logs).toEqual([
      'Kept stacktape-network-nat: Stack cannot be deleted while TerminationProtection is enabled'
    ]);
  });

  test('turns protection on again when CloudFormation cancels the delete because a stage imported the stack', async () => {
    const result = await runJanitor({
      stacks: [natStack(), networkStack(), stage('app-dev-c')],
      imports: usedBy('stacktape-network-vpc-id', 'stacktape-network-nat'),
      idle: { 'stacktape-network-nat': DAY + 1, 'stacktape-network': DAY + 1 },
      vpc: sharedVpc(),
      hooks: [{ after: 'unprotect stacktape-network-nat', do: [{ import: ['stacktape-network-nat-id', 'app-dev-c'] }] }]
    });
    expect(result.calls).toEqual(['protection stacktape-network-nat false', 'protection stacktape-network-nat true']);
    expect(result.protection['stacktape-network-nat']).toBe(true);
  });

  test('keeps protection on and the network when the NAT delete fails', async () => {
    const result = await runJanitor({
      stacks: [natStack(), networkStack()],
      imports: usedBy('stacktape-network-vpc-id', 'stacktape-network-nat'),
      idle: { 'stacktape-network-nat': DAY + 1, 'stacktape-network': DAY + 1 },
      vpc: sharedVpc(),
      failDelete: true
    });
    expect(result.calls).toEqual([
      'protection stacktape-network-nat false',
      'delete stacktape-network-nat as janitor-role',
      'unmark stacktape-network-nat'
    ]);
    expect(result.stacks).toEqual({ 'stacktape-network-nat': 'DELETE_FAILED', 'stacktape-network': 'CREATE_COMPLETE' });
  });

  test('waits for a NAT delete in progress, then removes the network', async () => {
    const result = await runJanitor({
      stacks: [{ ...natStack(), StackStatus: 'DELETE_IN_PROGRESS' }, networkStack()],
      idle: { 'stacktape-network': DAY + 1 },
      vpc: sharedVpc({ withNat: false })
    });
    expect(result.calls).toEqual([
      'protection stacktape-network false',
      'delete stacktape-network as janitor-role',
      'unmark stacktape-network'
    ]);
  });

  test('never deletes a stack under the name that Stacktape did not create', async () => {
    const result = await runJanitor({
      stacks: [{ ...networkStack(), Outputs: [{ OutputKey: 'VpcId', OutputValue: 'vpc-9' }] }],
      idle: { 'stacktape-network': DAY + 1 }
    });
    expect(result.calls).toEqual([]);
    expect(result.logs).toEqual(['Kept stacktape-network: it is not a stack Stacktape created']);
  });
});

describe('the keepers of the no-access group', () => {
  test('are created when missing and invoked on every run while the network is used', async () => {
    const result = await runJanitor({
      stacks: [networkStackV3(), stage('app-dev-b')],
      imports: usedBy('stacktape-network-vpc-id', 'app-dev-b'),
      functions: { [PUBLIC_KEEPER]: 'Active' },
      vpc: sharedVpc({ withNat: false })
    });
    expect(result.lambda).toEqual([
      `create ${PRIVATE_KEEPER} as keeper-role in subnet-1 with sg-none`,
      `invoke ${PUBLIC_KEEPER}`
    ]);
    // The new keeper cannot be invoked while Lambda creates its interfaces; that is not an error.
    expect(result.logs).toEqual([`Created ${PRIVATE_KEEPER}`, 'stacktape-network is used by app-dev-b']);
  });

  test('are created again when their creation failed', async () => {
    const result = await runJanitor({
      stacks: [networkStackV3(), stage('app-dev-b')],
      imports: usedBy('stacktape-network-vpc-id', 'app-dev-b'),
      functions: { [PUBLIC_KEEPER]: 'Failed', [PRIVATE_KEEPER]: 'Active' },
      vpc: sharedVpc({ withNat: false })
    });
    expect(result.lambda).toEqual([
      `delete ${PUBLIC_KEEPER}`,
      `create ${PUBLIC_KEEPER} as keeper-role in subnet-p0,subnet-p1 with sg-none`,
      `invoke ${PRIVATE_KEEPER}`
    ]);
  });

  test('are kept warm within the grace period, and left alone by an older network without the group', async () => {
    const withinGrace = await runJanitor({
      stacks: [networkStackV3()],
      idle: { 'stacktape-network': DAY - 60 },
      functions: { [PUBLIC_KEEPER]: 'Active', [PRIVATE_KEEPER]: 'Active' },
      vpc: sharedVpc({ withNat: false })
    });
    expect(withinGrace.lambda).toEqual([`invoke ${PUBLIC_KEEPER}`, `invoke ${PRIVATE_KEEPER}`]);

    const older = await runJanitor({
      stacks: [networkStack()],
      idle: { 'stacktape-network': 60 },
      vpc: sharedVpc({ withNat: false })
    });
    expect(older.lambda).toEqual([]);
  });

  test('are deleted before the network, which is kept until Lambda has released their interfaces', async () => {
    const releasing = await runJanitor({
      stacks: [networkStackV3()],
      idle: { 'stacktape-network': DAY + 1 },
      functions: { [PUBLIC_KEEPER]: 'Active', [PRIVATE_KEEPER]: 'Active' },
      vpc: sharedVpc({ withNat: false, interfaces: [noAccessInterface('eni-1'), noAccessInterface('eni-2')] })
    });
    expect(releasing.lambda).toEqual([`delete ${PUBLIC_KEEPER}`, `delete ${PRIVATE_KEEPER}`]);
    expect(releasing.calls).toEqual([]);
    expect(releasing.stacks['stacktape-network']).toBe('CREATE_COMPLETE');
    expect(releasing.logs).toContain(
      'Kept stacktape-network: Lambda has yet to release 2 network interfaces of the no-access group; a later run removes the network'
    );

    const released = await runJanitor({
      stacks: [networkStackV3()],
      idle: { 'stacktape-network': DAY + 1 },
      vpc: sharedVpc({ withNat: false })
    });
    expect(released.calls).toEqual([
      'protection stacktape-network false',
      'delete stacktape-network as janitor-role',
      'unmark stacktape-network'
    ]);
  });

  test("counts a stage function's interface in the no-access group as Stacktape's", async () => {
    // A failed stage keeps its functions without importing the network: the network then waits for them.
    const result = await runJanitor({
      stacks: [networkStackV3()],
      idle: { 'stacktape-network': DAY + 1 },
      vpc: sharedVpc({ withNat: false, interfaces: [noAccessInterface('eni-1')] })
    });
    expect(result.calls).toEqual([]);
    expect(result.logs.join('\n')).not.toContain('did not create');
  });

  const keeperEvent = (RequestType: string) => ({
    RequestType,
    StackId: 'arn:network/1',
    RequestId: 'r',
    LogicalResourceId: 'Keeper',
    ResourceProperties: {
      NoAccessSecurityGroupId: 'sg-none',
      PublicSubnetIds: ['subnet-p0', 'subnet-p1'],
      PrivateSubnetIds: ['subnet-1'],
      RoleArn: 'keeper-role'
    }
  });

  test('are created by the custom resource once the role can be used, without failing the network', async () => {
    const created = await runJanitor({ stacks: [networkStackV3()], event: keeperEvent('Create'), roleUnusableFor: 2 });
    expect(created.lambda).toEqual([
      `refused ${PUBLIC_KEEPER}`,
      `refused ${PUBLIC_KEEPER}`,
      `create ${PUBLIC_KEEPER} as keeper-role in subnet-p0,subnet-p1 with sg-none`,
      `create ${PRIVATE_KEEPER} as keeper-role in subnet-1 with sg-none`
    ]);
    expect(created.responses).toEqual([['SUCCESS', '']]);

    const refused = await runJanitor({
      stacks: [networkStackV3()],
      event: keeperEvent('Create'),
      roleUnusableFor: 1000
    });
    expect(refused.responses).toEqual([['SUCCESS', '']]);
    expect(refused.logs[0]).toStartWith('Could not create the keepers; the next run does');
  });

  test('are deleted by the custom resource with the stack', async () => {
    const result = await runJanitor({
      stacks: [{ ...networkStackV3(), StackStatus: 'DELETE_IN_PROGRESS' }],
      event: keeperEvent('Delete'),
      functions: { [PRIVATE_KEEPER]: 'Active' }
    });
    expect(result.lambda).toEqual([`delete ${PRIVATE_KEEPER}`]);
    expect(result.responses).toEqual([['SUCCESS', '']]);
  });
});

describe("the janitor's deletion barrier", () => {
  const deleting = (stackResources: Account['stackResources']): Account => ({
    stacks: [{ ...networkStack(), StackStatus: 'DELETE_IN_PROGRESS' }],
    event: {
      RequestType: 'Delete',
      StackId: 'arn:network/1',
      RequestId: 'r',
      LogicalResourceId: 'JanitorDeletionBarrier'
    },
    stackResources
  });
  const janitor = [
    { LogicalResourceId: 'JanitorFunction', ResourceStatus: 'CREATE_COMPLETE' },
    { LogicalResourceId: 'JanitorDeletionBarrier', ResourceStatus: 'DELETE_IN_PROGRESS' }
  ];

  test('lets CloudFormation go on once everything that is not the janitor is deleted', async () => {
    const result = await runJanitor(
      deleting([...janitor, { LogicalResourceId: 'Vpc', ResourceStatus: 'DELETE_COMPLETE' }])
    );
    expect(result.responses).toEqual([['SUCCESS', '']]);
  });

  test('fails, keeping the function and its role, when another resource failed or is still being deleted', async () => {
    const failed = await runJanitor(
      deleting([...janitor, { LogicalResourceId: 'Vpc', ResourceStatus: 'DELETE_FAILED' }])
    );
    expect(failed.responses).toEqual([['FAILED', 'Kept the janitor because CloudFormation could not delete Vpc']]);

    const slow = await runJanitor({
      ...deleting([...janitor, { LogicalResourceId: 'Vpc', ResourceStatus: 'DELETE_IN_PROGRESS' }]),
      deletesHang: true
    });
    expect(slow.responses[0][0]).toBe('FAILED');
  });

  test('answers at once when the stack itself is not being deleted', async () => {
    const result = await runJanitor({
      ...deleting([{ LogicalResourceId: 'Vpc', ResourceStatus: 'CREATE_COMPLETE' }]),
      stacks: [networkStack()]
    });
    expect(result.responses).toEqual([['SUCCESS', '']]);
  });
});
