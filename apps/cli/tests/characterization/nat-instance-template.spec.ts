import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import type { EnrichedStackResourceInfo } from '@domain-services/cloudformation-stack-manager/types';
import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { defineConfig, JsBundleLambdaPackaging, LambdaFunction } from '@stacktape/config-authoring';
import { synthesizeFixture } from './synthesis-fixture';

/**
 * `stackConfig.nat` decides two things: whether VPC functions get the private subnets (and so outbound internet),
 * and whether the NAT is a managed gateway or Stacktape-managed instances. The gateway template is the compatibility
 * promise: its logical IDs are what existing stacks have, and a switch to instances must only touch the NAT
 * resources and the routes.
 */

type Nat =
  | 'ec2'
  | 'ha-ec2'
  | 'gateway'
  | { type: 'ec2' | 'ha-ec2' | 'gateway'; availabilityZones?: 2 | 3; instanceSize?: string };

const createConfig = ({ nat, joinDefaultVpc = true }: { nat?: Nat; joinDefaultVpc?: boolean }) =>
  defineConfig(() => {
    const api = new LambdaFunction({
      packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/api.ts' }),
      joinDefaultVpc
    });
    return { resources: { api }, ...(nat ? { stackConfig: { nat } } : {}) };
  })({
    projectName: 'characterization',
    stage: 'baseline',
    region: 'eu-west-1',
    cliArgs: {} as any,
    command: 'synth',
    awsProfile: '',
    user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
  });

const synthesize = (
  { invocationId, ...options }: Parameters<typeof createConfig>[0] & { invocationId?: string },
  { existingStackResources }: { existingStackResources?: EnrichedStackResourceInfo[] } = {}
) =>
  synthesizeFixture({
    compiledConfig: createConfig(options),
    workingDir: join(import.meta.dir, 'fixtures', 'dense-application'),
    ...(invocationId ? { synthesisContext: { invocationId } } : {}),
    existingStackResources
  });

const resourcesOfType = (template: CloudFormationTemplate, type: string) =>
  Object.entries(template.Resources)
    .filter(([, resource]) => (resource as { Type: string }).Type === type)
    .map(([logicalName]) => logicalName)
    .sort();

const functionSubnets = (template: CloudFormationTemplate) =>
  (
    template.Resources[cfLogicalNames.lambda('api')] as { Properties: { VpcConfig: { SubnetIds: { Ref: string }[] } } }
  ).Properties.VpcConfig.SubnetIds.map(({ Ref }) => Ref);

const natRouteTarget = (template: CloudFormationTemplate, subnetIndex: number) =>
  (template.Resources[cfLogicalNames.natRoute(subnetIndex)] as { Properties: Record<string, { Ref: string }> })
    .Properties;

describe('NAT configuration', () => {
  test('without nat, a VPC function sits in the public subnets and no NAT exists', async () => {
    const template = await synthesize({});
    expect(functionSubnets(template)).toEqual([0, 1, 2].map((index) => cfLogicalNames.subnet(true, index)));
    expect(resourcesOfType(template, 'AWS::EC2::NatGateway')).toEqual([]);
    expect(resourcesOfType(template, 'AWS::AutoScaling::AutoScalingGroup')).toEqual([]);
    expect(template.Resources[cfLogicalNames.subnet(false, 0)]).toBeUndefined();
  });

  test('nat gateways keep their logical ids and move the VPC function to the private subnets', async () => {
    const template = await synthesize({ nat: 'gateway' });
    expect(functionSubnets(template)).toEqual([0, 1, 2].map((index) => cfLogicalNames.subnet(false, index)));
    expect(resourcesOfType(template, 'AWS::EC2::NatGateway')).toEqual([
      cfLogicalNames.natGateway(0),
      cfLogicalNames.natGateway(1)
    ]);
    expect(resourcesOfType(template, 'AWS::EC2::EIP')).toEqual([
      cfLogicalNames.natElasticIp(0),
      cfLogicalNames.natElasticIp(1)
    ]);
    expect(natRouteTarget(template, 2)).toMatchObject({ NatGatewayId: { Ref: cfLogicalNames.natGateway(1) } });
    expect(resourcesOfType(template, 'AWS::AutoScaling::AutoScalingGroup')).toEqual([]);
  });

  test('nat instances replace only the NAT resources and keep the route logical ids', async () => {
    const gateway = await synthesize({ nat: 'gateway' });
    const instance = await synthesize({ nat: 'ha-ec2' });
    const natOnly = (name: string) => /Nat/u.test(name) || /StpNatFailover/u.test(name);
    const shared = (template: CloudFormationTemplate) =>
      Object.keys(template.Resources)
        .filter((name) => !natOnly(name))
        .sort();
    expect(shared(instance)).toEqual(shared(gateway));

    expect(resourcesOfType(instance, 'AWS::EC2::NatGateway')).toEqual([]);
    expect(resourcesOfType(instance, 'AWS::AutoScaling::AutoScalingGroup')).toEqual([
      cfLogicalNames.natInstanceAutoscalingGroup(0),
      cfLogicalNames.natInstanceAutoscalingGroup(1)
    ]);
    expect(resourcesOfType(instance, 'AWS::EC2::NetworkInterface')).toEqual([
      cfLogicalNames.natInstanceNetworkInterface(0),
      cfLogicalNames.natInstanceNetworkInterface(1)
    ]);
    expect(resourcesOfType(instance, 'AWS::AutoScaling::LifecycleHook')).toHaveLength(2);
    expect(resourcesOfType(instance, 'AWS::Events::Rule')).toEqual(
      expect.arrayContaining([cfLogicalNames.natFailoverProbeRule(), cfLogicalNames.natFailoverAutoscalingEventsRule()])
    );
    for (const subnetIndex of [0, 1, 2]) {
      expect(natRouteTarget(instance, subnetIndex)).toMatchObject({
        NetworkInterfaceId: { Ref: cfLogicalNames.natInstanceNetworkInterface(Math.min(subnetIndex, 1)) }
      });
      expect(natRouteTarget(instance, subnetIndex).NatGatewayId).toBeUndefined();
    }
    // A deploy that replaces instances ends by putting the routes back home, after the zones have signalled and the
    // routes exist. The reconcile is keyed on the launch template versions, not on the invocation, so a deploy that
    // changes nothing leaves it unchanged and can take the fast path.
    const reconcile = instance.Resources[cfLogicalNames.customResourceNatRoutes()] as {
      DependsOn: string[];
      Properties: { natRoutes: { routes: unknown[]; launchTemplateVersions: unknown[] } };
    };
    expect(reconcile.Properties.natRoutes.routes).toHaveLength(3);
    expect(reconcile.Properties.natRoutes.launchTemplateVersions).toEqual(
      [0, 1].map((azIndex) => ({
        'Fn::GetAtt': [cfLogicalNames.natInstanceLaunchTemplate(azIndex), 'LatestVersionNumber']
      }))
    );
    const nextInvocation = await synthesize({ nat: 'ha-ec2', invocationId: 'another-invocation' });
    expect(nextInvocation.Resources[cfLogicalNames.customResourceNatRoutes()]).toEqual(reconcile as never);
    expect(reconcile.DependsOn).toEqual(
      expect.arrayContaining([
        cfLogicalNames.natInstanceAutoscalingGroup(0),
        cfLogicalNames.natInstanceAutoscalingGroup(1),
        cfLogicalNames.natRoute(2)
      ])
    );
    const launchTemplate = instance.Resources[cfLogicalNames.natInstanceLaunchTemplate(0)] as {
      Properties: { LaunchTemplateData: { InstanceType: string; ImageId: string } };
    };
    expect(launchTemplate.Properties.LaunchTemplateData.InstanceType).toBe('t4g.nano');
    expect(launchTemplate.Properties.LaunchTemplateData.ImageId).toContain('arm64');
  });

  test('zones launch in parallel on create and are replaced one after another once they exist', async () => {
    const zoneOrder = (template: CloudFormationTemplate) =>
      [1, 2].map((azIndex) =>
        (
          template.Resources[cfLogicalNames.natInstanceAutoscalingGroup(azIndex)] as { DependsOn: string[] }
        ).DependsOn.filter((name) => /NatInstanceAutoScalingGroup/u.test(name))
      );
    const deployedGroup = (azIndex: number) =>
      ({
        LogicalResourceId: cfLogicalNames.natInstanceAutoscalingGroup(azIndex),
        ResourceType: 'AWS::AutoScaling::AutoScalingGroup',
        PhysicalResourceId: `characterization-baseline-nat-${azIndex}`
      }) as EnrichedStackResourceInfo;

    // A first deploy (or a switch from gateways): nothing serves through the instances yet.
    expect(zoneOrder(await synthesize({ nat: { type: 'ha-ec2', availabilityZones: 3 } }))).toEqual([[], []]);
    // An update: a bad image never takes two zones down at once.
    expect(
      zoneOrder(
        await synthesize(
          { nat: { type: 'ha-ec2', availabilityZones: 3 } },
          { existingStackResources: [0, 1, 2].map(deployedGroup) }
        )
      )
    ).toEqual([[cfLogicalNames.natInstanceAutoscalingGroup(0)], [cfLogicalNames.natInstanceAutoscalingGroup(1)]]);
    // A third zone added to two deployed ones waits for them; the deployed ones keep their order.
    expect(
      zoneOrder(
        await synthesize(
          { nat: { type: 'ha-ec2', availabilityZones: 3 } },
          { existingStackResources: [0, 1].map(deployedGroup) }
        )
      )
    ).toEqual([[cfLogicalNames.natInstanceAutoscalingGroup(0)], [cfLogicalNames.natInstanceAutoscalingGroup(1)]]);
  });

  test('a new instance profile is created by the service Lambda; a deployed one keeps its CloudFormation form', async () => {
    const profileName = cfLogicalNames.natInstanceProfile();
    const policyName = cfLogicalNames.instanceProfileServiceLambdaPolicy(profileName);
    const launchTemplateProfile = (template: CloudFormationTemplate) =>
      (
        template.Resources[cfLogicalNames.natInstanceLaunchTemplate(0)] as {
          Properties: { LaunchTemplateData: { IamInstanceProfile: unknown } };
        }
      ).Properties.LaunchTemplateData.IamInstanceProfile;

    const created = await synthesize({ nat: 'ec2' });
    const profile = created.Resources[profileName] as {
      Type: string;
      DependsOn: string[];
      Properties: { ServiceToken: unknown; instanceProfile: Record<string, unknown> };
    };
    expect(profile.Type).toBe('AWS::CloudFormation::CustomResource');
    expect(profile.DependsOn).toEqual([policyName]);
    expect(profile.Properties.instanceProfile).toEqual({
      instanceProfileName: 'characterization-baseline-nat-instance-eu-west-1',
      roleName: { Ref: cfLogicalNames.natInstanceRole() },
      probeImageId: '{{resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64}}',
      probeSubnetId: { Ref: cfLogicalNames.subnet(true, 0) }
    });
    // The service Lambda may manage exactly this profile and pass exactly this role.
    const policy = created.Resources[policyName] as {
      Type: string;
      Properties: { Roles: unknown[]; PolicyDocument: { Statement: { Action: unknown; Resource: unknown }[] } };
    };
    expect(policy.Type).toBe('AWS::IAM::Policy');
    expect(policy.Properties.Roles).toEqual([{ Ref: cfLogicalNames.lambdaRole('stacktapeServiceLambda') }]);
    expect(policy.Properties.PolicyDocument.Statement.map(({ Resource }) => Resource)).toEqual([
      {
        'Fn::Sub':
          'arn:${AWS::Partition}:iam::${AWS::AccountId}:instance-profile/characterization-baseline-nat-instance-eu-west-1'
      },
      { 'Fn::GetAtt': [cfLogicalNames.natInstanceRole(), 'Arn'] }
    ]);
    expect(launchTemplateProfile(created)).toEqual({ Arn: { 'Fn::GetAtt': [profileName, 'Arn'] } });

    const deployed = await synthesize(
      { nat: 'ec2' },
      {
        existingStackResources: [
          {
            LogicalResourceId: profileName,
            ResourceType: 'AWS::IAM::InstanceProfile',
            PhysicalResourceId: 'characterization-baseline-NatInstanceInstanceProfile-abc'
          } as EnrichedStackResourceInfo
        ]
      }
    );
    expect(deployed.Resources[profileName]).toEqual({
      Type: 'AWS::IAM::InstanceProfile',
      Properties: { Roles: [{ Ref: cfLogicalNames.natInstanceRole() }] }
    } as never);
    expect(deployed.Resources[policyName]).toBeUndefined();
    expect(launchTemplateProfile(deployed)).toEqual(launchTemplateProfile(created));
  });

  test('ec2 is a single zone without a lifecycle hook, but with the probe that keeps its routes home', async () => {
    const template = await synthesize({ nat: { type: 'ec2', instanceSize: 't4g.micro' } });
    expect(resourcesOfType(template, 'AWS::AutoScaling::AutoScalingGroup')).toEqual([
      cfLogicalNames.natInstanceAutoscalingGroup(0)
    ]);
    expect(resourcesOfType(template, 'AWS::AutoScaling::LifecycleHook')).toEqual([]);
    expect(template.Resources[cfLogicalNames.natFailoverProbeRule()]).toBeDefined();
    for (const subnetIndex of [0, 1, 2]) {
      expect(natRouteTarget(template, subnetIndex)).toMatchObject({
        NetworkInterfaceId: { Ref: cfLogicalNames.natInstanceNetworkInterface(0) }
      });
    }
    const launchTemplate = template.Resources[cfLogicalNames.natInstanceLaunchTemplate(0)] as {
      Properties: { LaunchTemplateData: { InstanceType: string } };
    };
    expect(launchTemplate.Properties.LaunchTemplateData.InstanceType).toBe('t4g.micro');
  });

  test('instanceSize needs instances, zones need more than one, and an x86 size is refused', async () => {
    await expect(synthesize({ nat: { type: 'gateway', instanceSize: 't4g.micro' } })).rejects.toThrow(/instanceSize/u);
    await expect(synthesize({ nat: { type: 'ec2', availabilityZones: 2 } })).rejects.toThrow(/availabilityZones/u);
    await expect(synthesize({ nat: { type: 'ha-ec2', instanceSize: 't3.micro' } })).rejects.toThrow(/arm64/u);
  });
});
