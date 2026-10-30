/**
 * A stage in the shared non-production network (`stacktape-network`): its template creates no VPC, every network
 * interface it creates carries the stage's group, and nothing it creates admits the network's CIDR, which also holds
 * every other non-production stage.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import type { SharedNetwork } from '@domain-services/vpc-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { synthesizeFixture } from '../characterization/synthesis-fixture';

type Resource = { Type: string; Properties?: Record<string, any>; DependsOn?: string | string[] };

const network: SharedNetwork = {
  vpcId: 'vpc-0shared',
  vpcCidr: '10.231.0.0/16',
  publicSubnets: ['a', 'b', 'c'].map((zone) => ({ id: `subnet-public-${zone}`, availabilityZone: `eu-west-1${zone}` })),
  privateSubnets: ['a', 'b', 'c'].map((zone) => ({
    id: `subnet-private-${zone}`,
    availabilityZone: `eu-west-1${zone}`
  })),
  natPublicIp: '203.0.113.7'
};
const stageGroup = { Ref: cfLogicalNames.stageNetworkSecurityGroup() };

let directory: string;
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'stacktape-shared-network-'));
  await writeFile(join(directory, 'handler.ts'), 'export default async () => ({ statusCode: 200 });\n');
});
afterAll(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});

const vpcFunction = (extra = '') => `
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: handler.ts
      joinDefaultVpc: true${extra}`;

const stage = ({ apiConnectTo }: { apiConnectTo?: string } = {}) => `stackConfig:
  nat: ec2
resources:
  orders:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: synthetic-password
      engine:
        type: postgres
        properties:
          version: '16.9'
          primaryInstance:
            instanceSize: db.t4g.micro
      accessibility:
        accessibilityMode: vpc
  cache:
    type: redis
    properties:
      engine:
        type: valkey
        properties:
          instanceSize: cache.t4g.micro
      defaultUserPassword: synthetic-redis-password
  internalLb:
    type: application-load-balancer
    properties:
      interface: internal
  api:${vpcFunction(apiConnectTo ? `\n      connectTo: [${apiConnectTo}]` : '')}
  worker:
    type: worker-service
    properties:
      packaging:
        type: prebuilt-image
        properties:
          image: example.invalid/image:tag
      resources: { cpu: 0.25, memory: 512 }
      usePrivateSubnetsWithNAT: true
`;

const synthesize = async (config: string, deployedTemplate?: CloudFormationTemplate) => {
  await writeFile(join(directory, 'stacktape.yml'), config);
  return synthesizeFixture({
    configPath: join(directory, 'stacktape.yml'),
    workingDir: directory,
    identity: { projectName: 'shop', stage: 'dev' },
    sharedNetwork: { network, usesNat: true },
    deployedTemplate
  });
};

const resources = (template: CloudFormationTemplate) => template.Resources as Record<string, Resource>;
const json = (value: unknown) => JSON.stringify(value);

describe('a stage in the shared network', () => {
  let template: CloudFormationTemplate;
  beforeAll(async () => {
    template = await synthesize(stage());
  });

  test('creates no VPC, subnet, route, gateway or NAT, and depends on none', () => {
    const networkTypes = [
      'AWS::EC2::VPC',
      'AWS::EC2::Subnet',
      'AWS::EC2::RouteTable',
      'AWS::EC2::Route',
      'AWS::EC2::InternetGateway',
      'AWS::EC2::VPCGatewayAttachment',
      'AWS::EC2::NatGateway',
      'AWS::EC2::VPCEndpoint',
      'AWS::AutoScaling::AutoScalingGroup'
    ];
    expect(Object.values(resources(template)).filter(({ Type }) => networkTypes.includes(Type))).toEqual([]);
    for (const [logicalId, resource] of Object.entries(resources(template))) {
      for (const dependency of [resource.DependsOn ?? []].flat()) {
        expect(`${logicalId} -> ${dependency in resources(template) ? 'ok' : dependency}`).toBe(`${logicalId} -> ok`);
      }
    }
    expect(json(template)).toContain('subnet-private-a');
    expect(json(template)).toContain('vpc-0shared');
  });

  test('imports the network and the NAT in its own group, so neither can be deleted while the stage uses it', () => {
    const group = resources(template)[cfLogicalNames.stageNetworkSecurityGroup()];
    expect(group.Properties?.VpcId).toEqual({ 'Fn::ImportValue': 'stacktape-network-vpc-id' });
    expect(group.Properties?.Tags).toContainEqual({
      Key: 'stacktape:network-nat',
      Value: { 'Fn::ImportValue': 'stacktape-network-nat-id' }
    });
    expect(group.Properties?.SecurityGroupIngress).toBeUndefined();
  });

  test('admits nothing by CIDR: vpc-mode database, Redis and the internal load balancer admit the stage group only', () => {
    const groups = Object.entries(resources(template)).filter(([, { Type }]) => Type === 'AWS::EC2::SecurityGroup');
    expect(json(groups)).not.toContain('10.231.');
    expect(json(groups)).not.toContain('172.16.');
    for (const logicalId of [
      cfLogicalNames.dbSecurityGroup('orders'),
      cfLogicalNames.redisSecurityGroup('cache'),
      cfLogicalNames.loadBalancerSecurityGroup('internalLb')
    ]) {
      const ingress = resources(template)[logicalId].Properties?.SecurityGroupIngress as Record<string, unknown>[];
      expect(ingress.length).toBeGreaterThan(0);
      for (const rule of ingress) expect(rule.SourceSecurityGroupId).toEqual(stageGroup);
    }
  });

  test('every network interface the stage creates carries the stage group', () => {
    const fn = resources(template)[cfLogicalNames.lambda('api')];
    expect(fn.Properties?.VpcConfig.SecurityGroupIds).toContainEqual(stageGroup);
    expect(fn.Properties?.VpcConfig.SubnetIds).toEqual(['subnet-private-a', 'subnet-private-b', 'subnet-private-c']);
    const service = resources(template)[cfLogicalNames.ecsService('worker', false)];
    expect(service.Properties?.NetworkConfiguration.AwsvpcConfiguration.SecurityGroups).toContainEqual(stageGroup);
    const lb = Object.values(resources(template)).find(
      ({ Type }) => Type === 'AWS::ElasticLoadBalancingV2::LoadBalancer'
    );
    expect(lb?.Properties?.SecurityGroups).toContainEqual(stageGroup);
  });

  test('a function that changes connections keeps its previous group for one deploy, next to the stage group', async () => {
    const moved = await synthesize(stage({ apiConnectTo: 'orders' }), template);
    const fn = resources(moved)[cfLogicalNames.lambda('api')];
    const groups = fn.Properties?.VpcConfig.SecurityGroupIds as { Ref: string }[];
    expect(groups).toContainEqual(stageGroup);
    const previous = (
      resources(template)[cfLogicalNames.lambda('api')].Properties?.VpcConfig.SecurityGroupIds as {
        Ref: string;
      }[]
    )[0].Ref;
    expect(groups[0].Ref).not.toBe(previous);
    expect(resources(moved)[previous]?.Type).toBe('AWS::EC2::SecurityGroup');
  });
});

describe('the shared NAT stack', () => {
  test('creates its instance profile through its own function, not the 2-minute AWS::IAM::InstanceProfile', async () => {
    const { buildSharedNatTemplate, SHARED_NAT_CONTRACT_VERSION } =
      await import('../../src/domain/shared-network/template');
    const nat = buildSharedNatTemplate({ region: 'eu-west-1' }) as unknown as { Resources: Record<string, Resource> };
    expect(Object.values(nat.Resources).map(({ Type }) => Type)).not.toContain('AWS::IAM::InstanceProfile');
    expect(nat.Resources.InstanceProfile.Type).toBe('AWS::CloudFormation::CustomResource');
    expect(nat.Resources.InstanceProfile.Properties?.ServiceToken).toEqual({
      'Fn::GetAtt': ['InstanceProfileFunction', 'Arn']
    });
    expect(nat.Resources.LaunchTemplate.Properties?.LaunchTemplateData.IamInstanceProfile).toEqual({
      Arn: { 'Fn::GetAtt': ['InstanceProfile', 'Arn'] }
    });
    // CloudFormation takes at most 4,096 characters of inline code.
    expect(nat.Resources.InstanceProfileFunction.Properties?.Code.ZipFile.length).toBeLessThanOrEqual(4096);
    // NAT stacks deployed with AWS::IAM::InstanceProfile are reused as they are, never updated to this template.
    expect(SHARED_NAT_CONTRACT_VERSION).toBe(1);
  });
});

describe('the shared network stack', () => {
  test('adds its janitor without touching the VPC, subnets, route tables or exports of version 1', async () => {
    const { buildSharedNetworkTemplate } = await import('../../src/domain/shared-network/template');
    const network = buildSharedNetworkTemplate() as unknown as {
      Resources: Record<string, Resource>;
      Outputs: Record<string, { Export?: { Name: string } }>;
    };
    const janitor = Object.keys(network.Resources).filter((logicalId) => logicalId.startsWith('Janitor'));
    expect(janitor.sort()).toEqual([
      'JanitorDeletionBarrier',
      'JanitorFunction',
      'JanitorLogGroup',
      'JanitorRole',
      'JanitorSchedule'
    ]);
    // Version 1 resources neither reference nor depend on the janitor, so the upgrade only adds resources.
    const version1 = Object.entries(network.Resources).filter(([logicalId]) => !logicalId.startsWith('Janitor'));
    expect(version1).toHaveLength(22);
    for (const [, resource] of version1) expect(JSON.stringify(resource)).not.toContain('Janitor');
    expect(
      Object.values(network.Outputs)
        .flatMap(({ Export }) => (Export ? [Export.Name] : []))
        .sort()
    ).toEqual([
      'stacktape-network-private-route-table-ids',
      'stacktape-network-private-subnet-ids',
      'stacktape-network-public-subnet-ids',
      'stacktape-network-vpc-id'
    ]);
  });

  test("keeps the janitor's function and role until everything else of the stack is deleted", async () => {
    const { buildSharedNetworkTemplate } = await import('../../src/domain/shared-network/template');
    const { Resources } = buildSharedNetworkTemplate() as unknown as { Resources: Record<string, Resource> };
    // CloudFormation deletes a resource only after everything that depends on it. The barrier, whose delete waits for
    // the rest of the stack, depends on the function and the role; the rest of the janitor depends on the role.
    expect(Resources.JanitorDeletionBarrier.Properties?.ServiceToken).toEqual({
      'Fn::GetAtt': ['JanitorFunction', 'Arn']
    });
    expect(Resources.JanitorDeletionBarrier.DependsOn).toEqual(['JanitorRole']);
    expect(Resources.JanitorFunction.Properties?.Role).toEqual({ 'Fn::GetAtt': ['JanitorRole', 'Arn'] });
    expect(Resources.JanitorLogGroup.DependsOn).toEqual(['JanitorRole']);
    // What deletes resources applies in CloudFormation's session only, never in the function's own.
    const statements = Resources.JanitorRole.Properties?.Policies[0].PolicyDocument.Statement as Array<{
      Action: string | string[];
      Condition?: unknown;
    }>;
    const functionDeletes = new Set([
      'cloudformation:DeleteStack',
      'cloudformation:UpdateTerminationProtection',
      'ssm:DeleteParameter'
    ]);
    const cloudFormationOnly = statements.filter(({ Condition }) =>
      JSON.stringify(Condition ?? {}).includes('AWSCloudFormation')
    );
    for (const statement of statements) {
      if (cloudFormationOnly.includes(statement)) continue;
      const deletes = [statement.Action]
        .flat()
        .filter((action) => /:(Delete|Detach|Disassociate|Release|Revoke|Remove|Update)/.test(action));
      expect(deletes.filter((action) => !functionDeletes.has(action))).toEqual([]);
    }
  });
});
