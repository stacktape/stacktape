import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildSecurityGroupModel,
  type SecurityGroupModel,
  type SecurityGroupRule,
  type SecurityModelInput
} from './security-groups.js';

/**
 * The templates under `generated/security-group-templates` are synthesized by the CLI (see
 * `apps/cli/tests/synthesis-families/security-group-fixtures.ts`, which also checks they are current). Each records the
 * config it came from; the expectations below restate what the resource resolvers intend for that config.
 */
const FIXTURE_DIRECTORY = join(import.meta.dir, 'generated', 'security-group-templates');

type Fixture = SecurityModelInput & {
  config: string;
  resources: Record<string, { Type: string; Properties?: Record<string, unknown> }>;
};

const fixtureNames = readdirSync(FIXTURE_DIRECTORY)
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.slice(0, -'.json'.length))
  .sort();

const loadFixture = (name: string) =>
  JSON.parse(readFileSync(join(FIXTURE_DIRECTORY, `${name}.json`), 'utf8')) as Fixture;

const modelOf = (name: string) => buildSecurityGroupModel(loadFixture(name));

const groupById = (model: SecurityGroupModel, id: string) => {
  const group = model.groups.find((candidate) => candidate.id === id);
  if (!group) throw new Error(`No group ${id}; groups: ${model.groups.map(({ id: other }) => other).join(', ')}`);
  return group;
};

/** The group carried by the given member of a Stacktape resource, e.g. a web service's load balancer. */
const groupOf = (model: SecurityGroupModel, owner: string, kind: string) => {
  const found = model.groups.filter(({ members }) =>
    members.some((member) => member.owner?.name === owner && member.kind === kind)
  );
  if (found.length !== 1) throw new Error(`Expected one group carried by ${owner}/${kind}, found ${found.length}`);
  return found[0];
};

const ownersOf = (model: SecurityGroupModel, groupId: string) =>
  [...new Set(groupById(model, groupId).members.map(({ owner, kind }) => owner?.name ?? `(${kind})`))].sort();

const describePeer = (model: SecurityGroupModel, { peer }: SecurityGroupRule) => {
  switch (peer.kind) {
    case 'group':
      return `group of ${ownersOf(model, peer.groupId).join('+') || peer.groupId}`;
    case 'vpc':
      return `vpc ${peer.cidr ?? ''}`.trim();
    case 'prefix-list':
      return `prefix list ${peer.prefixListId}`;
    case 'unresolved':
      return `unresolved ${peer.reference}`;
    default:
      return `${peer.kind} ${peer.cidr}`;
  }
};

const describeRule = (model: SecurityGroupModel, rule: SecurityGroupRule) => {
  const ports = typeof rule.ports === 'string' ? rule.ports : `${rule.ports.from}-${rule.ports.to}`;
  return `${rule.protocol} ${ports} ${rule.direction === 'ingress' ? 'from' : 'to'} ${describePeer(model, rule)}`;
};

const ingressPeers = (model: SecurityGroupModel, groupId: string) =>
  model.rules.filter((rule) => rule.groupId === groupId && rule.direction === 'ingress').map(({ peer }) => peer);

const rulesOf = (model: SecurityGroupModel, groupId: string, direction: 'ingress' | 'egress') =>
  model.rules
    .filter((rule) => rule.groupId === groupId && rule.direction === direction)
    .map((rule) => describeRule(model, rule));

describe('real templates', () => {
  test('cover every scenario the generator writes', () => {
    expect(fixtureNames).toEqual([
      'batch-bastion-nat-instance',
      'database-accessibility',
      'ec2-workload-kafka',
      'http-api-vpc-link',
      'lambda-vpc',
      'private-network',
      'shared-network-no-access',
      'shared-network-stage'
    ]);
  });

  test.each(fixtureNames)(
    '%s: every group, member owner and peer is accounted for, and the model is deterministic',
    (name) => {
      const fixture = loadFixture(name);
      const model = buildSecurityGroupModel(fixture);
      const templateGroups = Object.entries(fixture.resources)
        .filter(([, { Type }]) => Type === 'AWS::EC2::SecurityGroup')
        .map(([logicalId]) => logicalId);
      expect(model.groups.filter(({ kind }) => kind === 'template').map(({ id }) => id)).toEqual(templateGroups);

      const stacktapeNames = new Set(fixture.stacktapeResources.map(({ name: resourceName }) => resourceName));
      for (const group of model.groups) {
        for (const member of group.members) {
          if (member.owner) expect(stacktapeNames.has(member.owner.name)).toBe(true);
          expect(fixture.resources[member.logicalId]?.Type).toBe(member.resourceType);
        }
      }
      const groupIds = new Set(model.groups.map(({ id }) => id));
      for (const rule of model.rules) {
        expect(groupIds.has(rule.groupId)).toBe(true);
        if (rule.peer.kind === 'group') expect(groupIds.has(rule.peer.groupId)).toBe(true);
        expect(rule.protocol).not.toBe('unknown');
        expect(rule.ports).not.toBe('unknown');
      }
      expect(buildSecurityGroupModel(structuredClone(fixture))).toEqual(model);
    }
  );

  test.each(fixtureNames)(
    '%s: every resource that refers to a group carries it, except the tagging schedule that passes IDs along',
    (name) => {
      const fixture = loadFixture(name);
      const model = buildSecurityGroupModel(fixture);
      const templateGroups = model.groups.filter(({ kind }) => kind === 'template');
      const missing: string[] = [];
      for (const [logicalId, resource] of Object.entries(fixture.resources)) {
        if (resource.Type.startsWith('AWS::EC2::SecurityGroup') || logicalId === 'StpStpCustomTaggingScheduleRule')
          continue;
        const serialized = JSON.stringify(resource);
        for (const group of templateGroups) {
          const refers =
            serialized.includes(JSON.stringify({ Ref: group.id })) ||
            serialized.includes(JSON.stringify({ 'Fn::GetAtt': [group.id, 'GroupId'] }));
          if (refers && !group.members.some((member) => member.logicalId === logicalId)) {
            missing.push(`${logicalId} (${resource.Type}) -> ${group.id}`);
          }
        }
      }
      expect(missing).toEqual([]);
    }
  );

  test('a database admits the internet, the VPC CIDR or only the workloads that connect to it, by accessibility mode', () => {
    const model = modelOf('database-accessibility');
    const database = (name: string) => groupOf(model, name, 'database');

    expect(rulesOf(model, database('publicDb').id, 'ingress')).toEqual(['tcp 5432-5432 from internet 0.0.0.0/0']);
    expect(rulesOf(model, database('vpcDb').id, 'ingress')).toEqual(['tcp 5432-5432 from vpc 172.16.0.0/16']);
    // `web` connects to scopedDb; the `reports` function joins the VPC but does not, so its group is not admitted.
    expect(rulesOf(model, database('scopedDb').id, 'ingress')).toEqual([
      'tcp 5432-5432 from group of web',
      'tcp 5432-5432 from cidr 203.0.113.10/32'
    ]);
    expect(ownersOf(model, groupOf(model, 'reports', 'function').id)).toEqual(['reports']);

    for (const name of ['publicDb', 'vpcDb', 'scopedDb']) {
      expect(database(name)).toMatchObject({ kind: 'template', owner: { name, type: 'relational-database' } });
      expect(database(name).members.map(({ kind, resourceType }) => `${kind} ${resourceType}`)).toEqual([
        'database AWS::RDS::DBInstance'
      ]);
      // The resolvers declare no egress, so EC2's allow-all rule applies.
      expect(
        model.rules.filter(({ groupId, direction }) => groupId === database(name).id && direction === 'egress')
      ).toEqual([
        expect.objectContaining({
          protocol: 'all',
          ports: 'all',
          peer: { kind: 'internet', cidr: '0.0.0.0/0' },
          origin: { kind: 'default' }
        })
      ]);
    }
  });

  test('a web service behind its HTTP API admits the VPC link, which accepts the internet on the container port', () => {
    const model = modelOf('database-accessibility');
    const service = groupOf(model, 'web', 'container-service');
    const vpcLink = groupOf(model, 'web', 'vpc-link');
    expect(rulesOf(model, service.id, 'ingress')).toEqual(['tcp 3000-3000 from group of web']);
    expect(ingressPeers(model, service.id)).toEqual([{ kind: 'group', groupId: vpcLink.id }]);
    expect(rulesOf(model, vpcLink.id, 'ingress')).toEqual(['tcp 3000-3000 from internet 0.0.0.0/0']);
  });

  test('a private service behind an internal load balancer is reachable from the VPC only, through the balancer', () => {
    const model = modelOf('private-network');
    const balancer = groupOf(model, 'internalApi', 'load-balancer');
    const service = groupOf(model, 'internalApi', 'container-service');
    expect(rulesOf(model, balancer.id, 'ingress')).toEqual(['tcp 3000-3000 from vpc 172.16.0.0/16']);
    expect(ingressPeers(model, service.id)).toEqual([{ kind: 'group', groupId: balancer.id }]);
  });

  test('a private worker admits nothing, and scoped Redis and EFS admit it on their ports', () => {
    const model = modelOf('private-network');
    const worker = groupOf(model, 'worker', 'container-service');
    expect(rulesOf(model, worker.id, 'ingress')).toEqual([]);
    expect(rulesOf(model, worker.id, 'egress')).toEqual(['all all to internet 0.0.0.0/0']);
    expect(rulesOf(model, groupOf(model, 'cache', 'redis').id, 'ingress')).toEqual([
      'tcp 6379-6379 from group of worker'
    ]);

    const files = groupOf(model, 'files', 'efs-mount-target');
    expect(rulesOf(model, files.id, 'ingress')).toEqual(['tcp 2049-2049 from group of worker']);
    expect(files.members.map(({ logicalId, kind }) => `${kind} ${logicalId}`)).toEqual([
      'efs-mount-target FilesSubnet0MountTarget',
      'efs-mount-target FilesSubnet1MountTarget',
      'efs-mount-target FilesSubnet2MountTarget'
    ]);
  });

  test('VPC functions with the same connections share one stack-wide group, which is all scoped Redis admits', () => {
    const model = modelOf('lambda-vpc');
    const connected = groupOf(model, 'search', 'function');
    expect(connected.owner).toBeUndefined();
    expect(ownersOf(model, connected.id)).toEqual(['indexer', 'search']);
    expect(ownersOf(model, groupOf(model, 'plain', 'function').id)).toEqual(['plain']);
    expect(rulesOf(model, groupOf(model, 'cache', 'redis').id, 'ingress')).toEqual([
      'tcp 6379-6379 from group of indexer+search'
    ]);
    expect(rulesOf(model, groupOf(model, 'searchDomain', 'opensearch').id, 'ingress')).toEqual([
      'tcp 443-443 from vpc 172.16.0.0/16'
    ]);
  });

  test('containers behind an HTTP API admit its VPC link; load-balanced services admit their balancer', () => {
    const model = modelOf('http-api-vpc-link');
    const vpcLink = groupOf(model, 'api', 'vpc-link');
    expect(vpcLink.owner).toEqual({ name: 'api', type: 'http-api-gateway' });
    expect(rulesOf(model, vpcLink.id, 'ingress')).toEqual(['tcp 8080-8080 from internet 0.0.0.0/0']);
    expect(rulesOf(model, groupOf(model, 'app', 'container-service').id, 'ingress')).toEqual([
      'tcp 8080-8080 from group of api'
    ]);

    // A blue/green service is Stacktape's resource provider, which wraps the ECS service.
    const blueGreen = groupOf(model, 'albWeb', 'container-service');
    expect(blueGreen.members.map(({ resourceType }) => resourceType)).toEqual(['Stacktape::ECSBlueGreenV1::Service']);
    const albBalancer = groupOf(model, 'albWeb', 'load-balancer');
    expect(rulesOf(model, albBalancer.id, 'ingress')).toEqual([
      'tcp 80-80 from internet 0.0.0.0/0',
      'tcp 443-443 from internet 0.0.0.0/0'
    ]);
    expect(ingressPeers(model, blueGreen.id)).toEqual([{ kind: 'group', groupId: albBalancer.id }]);

    const nlb = groupOf(model, 'tcpWeb', 'load-balancer');
    expect(rulesOf(model, nlb.id, 'ingress')).toEqual(['tcp 5000-5000 from internet 0.0.0.0/0']);
    expect(ingressPeers(model, groupOf(model, 'tcpWeb', 'container-service').id)).toEqual([
      { kind: 'group', groupId: nlb.id }
    ]);
  });

  test('batch jobs and AgentCore runtimes reach a scoped database through their groups', () => {
    const model = modelOf('batch-bastion-nat-instance');
    const batch = groupOf(model, 'importer', 'batch-job');
    expect(batch.owner).toBeUndefined();
    // Every compute environment carries the stack's batch group; the job runs on the on-demand one.
    expect(batch.members.map(({ kind, logicalId }) => `${kind} ${logicalId}`)).toEqual([
      'batch-compute-environment StpBatchOnDemandComputeEnvironment',
      'batch-compute-environment StpBatchSpotComputeEnvironment',
      'batch-job ImporterJobExecutionStateMachine'
    ]);
    expect(rulesOf(model, groupOf(model, 'db', 'database').id, 'ingress')).toEqual([
      'tcp 5432-5432 from group of (batch-compute-environment)+importer',
      'tcp 5432-5432 from group of agent'
    ]);
    expect(groupOf(model, 'agent', 'agentcore-runtime').owner).toEqual({ name: 'agent', type: 'agentcore-runtime' });
  });

  test('NAT instances accept everything from the VPC and send it anywhere; a bastion admits nothing', () => {
    const model = modelOf('batch-bastion-nat-instance');
    const nat = model.groups.find(({ members }) => members.some(({ kind }) => kind === 'nat-instance'));
    expect(
      nat?.members.map(({ kind, resourceType, owner }) => `${kind} ${resourceType} ${owner?.name ?? '-'}`)
    ).toEqual(['nat-instance AWS::EC2::NetworkInterface -', 'nat-instance AWS::EC2::LaunchTemplate -']);
    expect(rulesOf(model, nat!.id, 'ingress')).toEqual(['all all from vpc 172.16.0.0/16']);
    expect(model.rules.filter(({ groupId, direction }) => groupId === nat!.id && direction === 'egress')).toEqual([
      expect.objectContaining({
        protocol: 'all',
        peer: { kind: 'internet', cidr: '0.0.0.0/0' },
        origin: { kind: 'inline' }
      })
    ]);

    const bastion = groupOf(model, 'jumpHost', 'ec2-instances');
    expect(bastion.members.map(({ resourceType }) => resourceType)).toEqual(['AWS::EC2::LaunchTemplate']);
    expect(rulesOf(model, bastion.id, 'ingress')).toEqual([]);
  });

  test('an EC2-backed service admits ephemeral ports from its balancer; Kafka admits its connectors and itself', () => {
    const model = modelOf('ec2-workload-kafka');
    const instances = groupOf(model, 'ec2Web', 'ec2-instances');
    expect(rulesOf(model, instances.id, 'ingress')).toEqual(['tcp 32768-65535 from group of ec2Web']);

    const kafka = groupOf(model, 'events', 'kafka');
    expect(rulesOf(model, kafka.id, 'ingress')).toEqual([
      'tcp 9098-9098 from group of producer',
      'tcp 9098-9098 from group of events'
    ]);
    const selfRule = model.rules.find(
      ({ groupId, peer }) => groupId === kafka.id && peer.kind === 'group' && peer.groupId === kafka.id
    );
    expect(selfRule?.origin).toEqual({ kind: 'resource', logicalId: 'EventsKafkaSelfSecurityGroupIngress' });

    // The consumer reaches Kafka through its event-source mapping, not its own group.
    expect(ownersOf(model, groupOf(model, 'consumer', 'function').id)).toEqual(['consumer']);
    const endpoints = model.groups.find(({ members }) => members.some(({ kind }) => kind === 'vpc-endpoint'));
    expect(endpoints?.members.map(({ logicalId }) => logicalId)).toEqual([
      'StpKafkaOnDemandlambdaVpcEndpoint',
      'StpKafkaOnDemandstsVpcEndpoint'
    ]);
    expect(rulesOf(model, endpoints!.id, 'ingress')).toEqual(['tcp 443-443 from vpc 172.16.0.0/16']);
  });

  test("in the shared network the stage's group stands in for the VPC CIDR and every network interface carries it", () => {
    const model = modelOf('shared-network-stage');
    expect(model.rules.some(({ peer }) => peer.kind === 'vpc' || peer.kind === 'cidr')).toBe(false);
    const stage = groupById(model, 'StpStageNetworkSecurityGroup');
    expect(stage.owner).toBeUndefined();
    expect(ownersOf(model, stage.id)).toEqual(['api', 'cron', 'internalLb']);
    // The internal load balancer carries its own group and the stage's; its own admits the stage's.
    const balancer = model.groups.filter(({ members }) => members.some(({ kind }) => kind === 'load-balancer'));
    expect(balancer.map(({ id }) => id)).toEqual(['InternalLbLbSecurityGroup', stage.id]);
    expect(rulesOf(model, 'InternalLbLbSecurityGroup', 'ingress')).toEqual([
      'tcp 80-80 from group of api+cron+internalLb',
      'tcp 443-443 from group of api+cron+internalLb'
    ]);
    expect(rulesOf(model, groupOf(model, 'orders', 'database').id, 'ingress')).toEqual([
      'tcp 5432-5432 from group of api'
    ]);
  });

  test("a function in the shared network's no-access group is a member of an external group", () => {
    const model = modelOf('shared-network-no-access');
    const noAccess = groupById(model, 'external:sg-0noaccess');
    expect(noAccess).toMatchObject({ kind: 'external', reference: 'sg-0noaccess' });
    expect(noAccess.members.map(({ owner, kind }) => `${owner?.name} ${kind}`)).toEqual(['cron function']);
    expect(model.rules.filter(({ groupId }) => groupId === noAccess.id)).toEqual([]);
  });
});

/** A model from hand-written resources, for input that synthesis never produces. */
const build = (resources: unknown, stacktapeResources: SecurityModelInput['stacktapeResources'] = []) =>
  buildSecurityGroupModel({ resources, stacktapeResources });
const group = (properties: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({
  Type: 'AWS::EC2::SecurityGroup',
  Properties: { GroupDescription: 'test', ...properties },
  ...extra
});
const fn = (securityGroupIds: unknown, extra: Record<string, unknown> = {}) => ({
  Type: 'AWS::Lambda::Function',
  Properties: { VpcConfig: { SecurityGroupIds: securityGroupIds } },
  ...extra
});

describe('template input it cannot fully read', () => {
  // Each case is wrapped: `test.each` spreads an array case into arguments.
  test.each([[undefined], [null], ['Resources'], [42], [[]], [[{ Type: 'AWS::EC2::SecurityGroup' }]]])(
    'resources %p give an empty model',
    (resources: unknown) => {
      expect(build(resources)).toEqual({ groups: [], rules: [] });
    }
  );

  test('malformed resources, rules and references are skipped', () => {
    const model = build({
      NoType: { Properties: {} },
      BadType: { Type: 7 },
      NotAnObject: 'AWS::EC2::SecurityGroup',
      Group: group({
        SecurityGroupIngress: [
          null,
          'tcp 80',
          { IpProtocol: 'tcp', FromPort: 80, ToPort: 80 },
          { IpProtocol: 'tcp', FromPort: '443', ToPort: '443', CidrIp: '0.0.0.0/0' },
          { IpProtocol: 'tcp', FromPort: { Ref: 'Port' }, ToPort: 80, CidrIp: '10.0.0.0/8' },
          { IpProtocol: 'gre', CidrIp: '10.0.0.0/8' },
          { IpProtocol: 'tcp', FromPort: 22, ToPort: 22, SourceSecurityGroupId: 42 }
        ],
        SecurityGroupEgress: 'everything'
      }),
      PropertiesNotAnObject: { Type: 'AWS::EC2::SecurityGroup', Properties: ['x'] },
      Fn: fn([null, 17, { Ref: 42 }, { 'Fn::GetAtt': 'NoDot' }, { Ref: 'Group' }]),
      BadList: fn({ Ref: 'Group' })
    });
    expect(
      model.groups.map(({ id, members }) => `${id}: ${members.map(({ logicalId }) => logicalId).join(',')}`)
    ).toEqual(['Group: Fn', 'PropertiesNotAnObject: ']);
    expect(model.rules.map((rule) => describeRule(model, rule))).toEqual([
      'tcp 443-443 from internet 0.0.0.0/0',
      'tcp unknown from cidr 10.0.0.0/8',
      'unknown unknown from cidr 10.0.0.0/8',
      'all all to internet 0.0.0.0/0',
      'all all to internet 0.0.0.0/0'
    ]);
  });

  test('references it cannot resolve become external groups, never errors', () => {
    const model = build(
      {
        Group: group(),
        Fn: fn([
          { 'Fn::GetAtt': ['Group', 'GroupId'] },
          'Group.GroupId',
          { 'Fn::GetAtt': 'Group.GroupId' },
          'sg-0123456789abcdef0',
          { 'Fn::ImportValue': 'shared-sg' },
          { 'Fn::ImportValue': { 'Fn::Sub': '${Env}-sg' } },
          { Ref: 'SecurityGroupParameter' },
          { 'Fn::GetAtt': ['StpVpc', 'DefaultSecurityGroup'] },
          { 'Fn::Sub': '${AWS::StackName}-sg' },
          { 'Fn::Select': [0, { Ref: 'Groups' }] }
        ])
      },
      [{ name: 'worker', type: 'function', logicalIds: ['Fn'] }]
    );
    expect(
      model.groups.map(
        ({ id, kind, members }) => `${kind} ${id} [${members.map(({ owner }) => owner?.name).join(',')}]`
      )
    ).toEqual([
      'template Group [worker]',
      'external external:Group.GroupId [worker]',
      'external external:sg-0123456789abcdef0 [worker]',
      'external external:import:shared-sg [worker]',
      'external external:import:{"Fn::Sub":"${Env}-sg"} [worker]',
      'external external:ref:SecurityGroupParameter [worker]',
      'external external:getatt:StpVpc.DefaultSecurityGroup [worker]',
      'external external:{"Fn::Sub":"${AWS::StackName}-sg"} [worker]',
      'external external:{"Fn::Select":[0,{"Ref":"Groups"}]} [worker]'
    ]);
  });

  test('Fn::If keeps both branches with their conditions; resource conditions and AWS::NoValue are respected', () => {
    const model = build({
      Group: group(
        {
          SecurityGroupIngress: {
            'Fn::If': [
              'IsProduction',
              [{ IpProtocol: 'tcp', FromPort: 443, ToPort: 443, CidrIp: '0.0.0.0/0' }],
              [
                {
                  IpProtocol: 'tcp',
                  FromPort: 443,
                  ToPort: 443,
                  CidrIp: { 'Fn::If': ['HasOffice', '198.51.100.0/24', { Ref: 'AWS::NoValue' }] }
                }
              ]
            ]
          }
        },
        { Condition: 'UsesVpc' }
      ),
      Other: group(),
      Fn: fn({ 'Fn::If': ['Isolated', [{ Ref: 'Other' }], [{ Ref: 'Group' }, { Ref: 'AWS::NoValue' }]] })
    });
    expect(groupById(model, 'Group').conditions).toEqual(['UsesVpc']);
    expect(
      model.rules
        .filter(({ groupId }) => groupId === 'Group')
        .map((rule) => `${describeRule(model, rule)} if ${rule.conditions.join(' ')}`)
    ).toEqual([
      'tcp 443-443 from internet 0.0.0.0/0 if UsesVpc IsProduction',
      'tcp 443-443 from cidr 198.51.100.0/24 if UsesVpc !IsProduction HasOffice',
      'all all to internet 0.0.0.0/0 if UsesVpc'
    ]);
    expect(groupById(model, 'Other').members[0]?.conditions).toEqual(['Isolated']);
    expect(groupById(model, 'Group').members[0]?.conditions).toEqual(['!Isolated']);
  });

  test('standalone rules attach to their group; only inline egress replaces the default egress', () => {
    const model = build({
      Vpc: { Type: 'AWS::EC2::VPC', Properties: { CidrBlock: '10.0.0.0/16' } },
      Secondary: { Type: 'AWS::EC2::VPCCidrBlock', Properties: { VpcId: { Ref: 'Vpc' }, CidrBlock: '10.1.0.0/16' } },
      Open: group(),
      Closed: group({ SecurityGroupEgress: [{ IpProtocol: '-1', CidrIp: '127.0.0.1/32' }] }),
      FromVpc: {
        Type: 'AWS::EC2::SecurityGroupIngress',
        Properties: {
          GroupId: { 'Fn::GetAtt': ['Open', 'GroupId'] },
          IpProtocol: '6',
          FromPort: 22,
          ToPort: 22,
          CidrIp: { 'Fn::GetAtt': ['Vpc', 'CidrBlock'] }
        }
      },
      FromSecondary: {
        Type: 'AWS::EC2::SecurityGroupIngress',
        Properties: { GroupId: { Ref: 'Open' }, IpProtocol: 'udp', FromPort: 53, ToPort: 53, CidrIp: '10.1.0.0/16' }
      },
      ToPrefixList: {
        Type: 'AWS::EC2::SecurityGroupEgress',
        Properties: {
          GroupId: { Ref: 'Open' },
          IpProtocol: 'tcp',
          FromPort: 443,
          ToPort: 443,
          DestinationPrefixListId: 'pl-0123'
        }
      },
      Ping: {
        Type: 'AWS::EC2::SecurityGroupIngress',
        Properties: { GroupId: { Ref: 'Closed' }, IpProtocol: 'icmpv6', FromPort: -1, ToPort: -1, CidrIpv6: '::/0' }
      },
      Esp: {
        Type: 'AWS::EC2::SecurityGroupIngress',
        Properties: { GroupId: 'sg-0external', IpProtocol: '50', SourceSecurityGroupId: { Ref: 'Closed' } }
      },
      Orphan: {
        Type: 'AWS::EC2::SecurityGroupIngress',
        Properties: { IpProtocol: 'tcp', FromPort: 1, ToPort: 1, CidrIp: '0.0.0.0/0' }
      }
    });
    expect(model.rules.map((rule) => `${rule.groupId}: ${describeRule(model, rule)} (${rule.origin.kind})`)).toEqual([
      'Open: tcp 22-22 from vpc 10.0.0.0/16 (resource)',
      'Open: udp 53-53 from vpc 10.1.0.0/16 (resource)',
      'Open: tcp 443-443 to prefix list pl-0123 (resource)',
      'Open: all all to internet 0.0.0.0/0 (default)',
      'Closed: all all to cidr 127.0.0.1/32 (inline)',
      'Closed: icmpv6 all from internet ::/0 (resource)',
      'external:sg-0external: 50 all from group of Closed (resource)'
    ]);
  });

  test('NAT instances are told apart by their forwarding interface; batch jobs join through their queue', () => {
    const model = build(
      {
        Nat: group(),
        Batch: group(),
        Eni: { Type: 'AWS::EC2::NetworkInterface', Properties: { GroupSet: [{ Ref: 'Nat' }], SourceDestCheck: false } },
        Plain: { Type: 'AWS::EC2::NetworkInterface', Properties: { GroupSet: [{ Ref: 'Nat' }] } },
        Template: {
          Type: 'AWS::EC2::LaunchTemplate',
          Properties: {
            LaunchTemplateData: {
              NetworkInterfaces: [{ Groups: [{ Ref: 'Nat' }] }],
              UserData: { 'Fn::Base64': { 'Fn::Sub': ['attach ${eni}', { eni: { Ref: 'Eni' } }] } }
            }
          }
        },
        Environment: {
          Type: 'AWS::Batch::ComputeEnvironment',
          Properties: { ComputeResources: { SecurityGroupIds: [{ Ref: 'Batch' }] } }
        },
        Queue: {
          Type: 'AWS::Batch::JobQueue',
          Properties: { ComputeEnvironmentOrder: [{ ComputeEnvironment: { Ref: 'Environment' }, Order: 0 }] }
        },
        Job: { Type: 'AWS::StepFunctions::StateMachine', DependsOn: 'Queue', Properties: {} },
        Unrelated: { Type: 'AWS::StepFunctions::StateMachine', Properties: {} }
      },
      [{ name: 'importer', type: 'batch-job', logicalIds: ['Job'] }]
    );
    expect(groupById(model, 'Nat').members.map(({ logicalId, kind }) => `${logicalId} ${kind}`)).toEqual([
      'Eni nat-instance',
      'Plain network-interface',
      'Template nat-instance'
    ]);
    expect(
      groupById(model, 'Batch').members.map(
        ({ logicalId, kind, owner }) => `${logicalId} ${kind} ${owner?.name ?? '-'}`
      )
    ).toEqual(['Environment batch-compute-environment -', 'Job batch-job importer']);
  });

  test('a cyclic value, as a YAML alias can produce, does not hang or throw', () => {
    const cyclic: Record<string, unknown> = { IpProtocol: 'tcp', FromPort: 80, ToPort: 80, CidrIp: '0.0.0.0/0' };
    cyclic.Self = cyclic;
    const userData: Record<string, unknown> = {};
    userData.Loop = [userData];
    const model = build({
      Group: group({ SecurityGroupIngress: [cyclic] }),
      Eni: { Type: 'AWS::EC2::NetworkInterface', Properties: { GroupSet: [{ Ref: 'Group' }], SourceDestCheck: false } },
      Template: {
        Type: 'AWS::EC2::LaunchTemplate',
        Properties: { LaunchTemplateData: { SecurityGroupIds: [{ Ref: 'Group' }], UserData: userData } }
      }
    });
    expect(model.rules.map((rule) => describeRule(model, rule))).toEqual([
      'tcp 80-80 from internet 0.0.0.0/0',
      'all all to internet 0.0.0.0/0'
    ]);
  });
});
