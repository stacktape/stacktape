/**
 * A release command through the real synthesis path: it runs in a task definition of its own, after what it needs and
 * before the workloads it prepares. A stack without the setting gets none of it.
 */
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { describe, expect, spyOn, test } from 'bun:test';
import { ec2Manager } from '@domain-services/ec2-manager';
import { join } from 'node:path';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { synthesizeFixture } from '../characterization/synthesis-fixture';
import { orderReleaseCommands } from '../../src/domain/calculated-stack-overview-manager/resource-resolvers/multi-container-workloads/release-command';

type Resource = { Type: string; Properties?: Record<string, any>; DependsOn?: string[] };

const fixturesDir = join(import.meta.dir, 'fixtures');
const image = { type: 'prebuilt-image', properties: { image: 'public.ecr.aws/docker/library/alpine:3.20' } };
const service = (extra: Record<string, unknown>) => ({
  type: 'web-service',
  properties: { packaging: image, resources: { cpu: 0.25, memory: 512 }, ...extra }
});

const synthesize = async (resources: Record<string, unknown>) =>
  (await synthesizeFixture({
    compiledConfig: { config: { resources } } as never,
    workingDir: fixturesDir
  })) as CloudFormationTemplate & { Resources: Record<string, Resource> };

const dependsOn = (template: { Resources: Record<string, Resource> }, logicalId: string) =>
  [template.Resources[logicalId]?.DependsOn ?? []].flat();

const resolveEc2InstanceTypes = () =>
  spyOn(ec2Manager, 'init').mockImplementation(async () => {
    ec2Manager.ec2InstanceTypes = [
      {
        InstanceType: 't3.micro',
        ProcessorInfo: { SupportedArchitectures: ['x86_64'] },
        VCpuInfo: { DefaultVCpus: 2 },
        MemoryInfo: { SizeInMiB: 1024 }
      }
    ] as never;
  });

describe('release command synthesis', () => {
  test('runs the command in its own task definition, before the service', async () => {
    const template = await synthesize({ api: service({ releaseCommand: 'php craft up' }) });
    const taskDefinition = template.Resources[cfLogicalNames.ecsReleaseTaskDefinition('api')]!;
    const [container, ...others] = taskDefinition.Properties!.ContainerDefinitions;
    expect(others).toEqual([]);
    expect(container.EntryPoint).toEqual(['/bin/sh', '-c']);
    expect(container.Command).toEqual(['php craft up']);
    expect(container.Essential).toBe(true);
    expect(container.PortMappings).toBeUndefined();
    expect(container.HealthCheck).toBeUndefined();
    expect(container.Image).toBe(image.properties.image);
    expect(container.LogConfiguration.Options['awslogs-group']).toEqual({
      Ref: cfLogicalNames.ecsLogGroup('api', 'stp-release')
    });
    const main = template.Resources[cfLogicalNames.ecsTaskDefinition('api')]!;
    expect(taskDefinition.Properties!.TaskRoleArn).toEqual(main.Properties!.TaskRoleArn);
    expect(taskDefinition.Properties!.ExecutionRoleArn).toEqual(main.Properties!.ExecutionRoleArn);
    expect(taskDefinition.Properties!.Family).not.toEqual(main.Properties!.Family);

    const customResource = cfLogicalNames.releaseCommandCustomResource('api');
    expect(template.Resources[customResource]!.Properties!.releaseCommand).toMatchObject({
      taskDefinition: { Ref: cfLogicalNames.ecsReleaseTaskDefinition('api') },
      containerName: container.Name,
      timeoutSeconds: 3300,
      run: 'if-target-changed'
    });
    expect(dependsOn(template, cfLogicalNames.ecsService('api', false))).toContain(customResource);
  });

  test('keeps a side container the target depends on, and removes the rest', async () => {
    const template = await synthesize({
      app: {
        type: 'multi-container-workload',
        properties: {
          resources: { cpu: 0.5, memory: 1024 },
          scaling: { minInstances: 1, maxInstances: 1 },
          releaseCommand: { command: 'migrate up', container: 'migrator' },
          containers: [
            { name: 'proxy', packaging: image, essential: false },
            { name: 'migrator', packaging: image, dependsOn: [{ containerName: 'proxy', condition: 'START' }] },
            { name: 'server', packaging: image }
          ]
        }
      }
    });
    const containers = template.Resources[cfLogicalNames.ecsReleaseTaskDefinition('app')]!.Properties!
      .ContainerDefinitions as { Name: string; Essential: boolean; EntryPoint?: string[] }[];
    expect(containers.map(({ Name }) => Name).sort()).toEqual(['migrator', 'proxy']);
    expect(containers.find(({ Name }) => Name === 'proxy')!.Essential).toBe(false);
    expect(containers.find(({ Name }) => Name === 'proxy')!.EntryPoint).toBeUndefined();
    expect(containers.find(({ Name }) => Name === 'migrator')!.Essential).toBe(true);
  });

  test('runs several commands one at a time in config order, and holds back every service', async () => {
    const template = await synthesize({
      second: service({ releaseCommand: 'second' }),
      plain: service({}),
      first: service({ releaseCommand: 'first' })
    });
    const second = cfLogicalNames.releaseCommandCustomResource('second');
    const first = cfLogicalNames.releaseCommandCustomResource('first');
    expect(dependsOn(template, first)).toContain(second);
    for (const name of ['first', 'second', 'plain']) {
      expect(dependsOn(template, cfLogicalNames.ecsService(name, false))).toContain(first);
    }
  });

  test('uses the capacity provider and no awsvpc configuration on EC2', async () => {
    const init = resolveEc2InstanceTypes();
    const template = await synthesize({
      api: service({ releaseCommand: 'migrate', resources: { instanceTypes: ['t3.micro'], cpu: 1, memory: 512 } })
    });
    init.mockRestore();
    const props = template.Resources[cfLogicalNames.releaseCommandCustomResource('api')]!.Properties!.releaseCommand;
    expect(props.awsvpcConfiguration).toBeUndefined();
    expect(props.capacityProviderStrategy).toEqual([
      { capacityProvider: { Ref: cfLogicalNames.ecsEc2CapacityProvider('api') }, weight: 1 }
    ]);
    expect(dependsOn(template, cfLogicalNames.releaseCommandCustomResource('api'))).toContain(
      cfLogicalNames.ecsEc2CapacityProviderAssociation('api')
    );
  });

  test('gives the service Lambda ECS access only when the stack has a command', async () => {
    const statementsOf = (template: { Resources: Record<string, Resource> }) =>
      JSON.stringify(template.Resources[cfLogicalNames.lambdaRole('stacktapeServiceLambda')]?.Properties);
    expect(statementsOf(await synthesize({ api: service({ releaseCommand: 'migrate' }) }))).toContain('ecs:RunTask');
    expect(statementsOf(await synthesize({ api: service({}) }))).not.toContain('ecs:RunTask');
  });

  test('leaves a stack without the setting untouched', async () => {
    const template = await synthesize({ api: service({}) });
    expect(Object.keys(template.Resources).filter((logicalId) => /release/i.test(logicalId))).toEqual([]);
  });

  test('rejects a multi-container workload that does not name a container', async () => {
    await expect(
      synthesize({
        app: {
          type: 'multi-container-workload',
          properties: {
            resources: { cpu: 0.5, memory: 1024 },
            scaling: { minInstances: 1, maxInstances: 1 },
            releaseCommand: 'migrate',
            containers: [
              { name: 'one', packaging: image },
              { name: 'two', packaging: image }
            ]
          }
        }
      })
    ).rejects.toThrow(/which container/);
  });
});

describe('release command of a function', () => {
  const database = (accessibilityMode: string) => ({
    type: 'relational-database',
    properties: {
      credentials: { masterUserPassword: 'not-a-real-password' },
      engine: { type: 'postgres', properties: { version: '17', primaryInstance: { instanceSize: 'db.t4g.micro' } } },
      accessibility: { accessibilityMode }
    }
  });
  const lambda = (extra: Record<string, unknown>) => ({
    type: 'function',
    properties: { packaging: { type: 'js-bundle', properties: { entryfilePath: './src/handler.ts' } }, ...extra }
  });
  const task = 'apiReleaseTask';

  test("runs in a task with the function's environment and connections, before any function", async () => {
    const template = await synthesize({
      db: database('scoping-workloads-in-vpc'),
      api: lambda({
        connectTo: ['db'],
        joinDefaultVpc: true,
        environment: [{ name: 'MODE', value: 'production' }],
        iamRoleStatements: [{ Resource: ['*'], Action: ['ses:SendEmail'] }],
        releaseCommand: { command: 'npx prisma migrate deploy', runWhenChanged: ['src'] }
      }),
      other: lambda({})
    });
    const [container, ...others] = template.Resources[cfLogicalNames.ecsReleaseTaskDefinition(task)]!.Properties!
      .ContainerDefinitions as { Name: string; Command: string[]; Environment: { Name: string }[] }[];
    expect(others).toEqual([]);
    expect(container!.Command).toEqual(['npx prisma migrate deploy']);
    expect(container!.Environment.map(({ Name }) => Name)).toEqual(
      expect.arrayContaining(['MODE', 'STP_DB_CONNECTION_STRING'])
    );
    expect(JSON.stringify(template.Resources[cfLogicalNames.ecsTaskRole(task)]!.Properties)).toContain('ses:SendEmail');

    // A task of its own: no service runs between deploys.
    expect(template.Resources[cfLogicalNames.ecsCluster(task)]!.Type).toBe('AWS::ECS::Cluster');
    expect(Object.values(template.Resources).filter(({ Type }) => Type === 'AWS::ECS::Service')).toEqual([]);
    expect(template.Resources[cfLogicalNames.ecsTaskDefinition(task)]).toBeUndefined();

    // The database admits the task as it admits the function.
    expect(template.Resources[cfLogicalNames.dbSecurityGroup('db')]!.Properties!.SecurityGroupIngress).toContainEqual(
      expect.objectContaining({ SourceSecurityGroupId: { Ref: cfLogicalNames.workloadSecurityGroup(task) } })
    );

    const customResource = cfLogicalNames.releaseCommandCustomResource(task);
    expect(template.Resources[customResource]!.Properties!.releaseCommand).toMatchObject({
      cluster: { Ref: cfLogicalNames.ecsCluster(task) },
      taskDefinition: { Ref: cfLogicalNames.ecsReleaseTaskDefinition(task) },
      awsvpcConfiguration: { securityGroups: [{ Ref: cfLogicalNames.workloadSecurityGroup(task) }] }
    });
    expect(dependsOn(template, customResource)).toContain(cfLogicalNames.dbInstance('db'));
    for (const name of ['api', 'other']) {
      expect(dependsOn(template, cfLogicalNames.lambda(name))).toContain(customResource);
    }
    const serviceLambdaRole = JSON.stringify(
      template.Resources[cfLogicalNames.lambdaRole('stacktapeServiceLambda')]?.Properties
    );
    expect(serviceLambdaRole).toContain('ecs:RunTask');
    expect(serviceLambdaRole).toContain(`-${task}-release`);
  });

  test('creates the VPC it runs in for a stack that has none', async () => {
    const template = await synthesize({ api: lambda({ releaseCommand: 'node migrate.js' }) });
    const { awsvpcConfiguration } =
      template.Resources[cfLogicalNames.releaseCommandCustomResource(task)]!.Properties!.releaseCommand;
    expect(awsvpcConfiguration.assignPublicIp).toBe('ENABLED');
    expect(awsvpcConfiguration.subnets.length).toBeGreaterThan(0);
    for (const { Ref } of awsvpcConfiguration.subnets) expect(template.Resources[Ref]!.Type).toBe('AWS::EC2::Subnet');
  });

  test("runs with services' commands in config order", async () => {
    const template = await synthesize({
      web: service({ releaseCommand: 'first' }),
      api: lambda({ releaseCommand: 'second' })
    });
    expect(dependsOn(template, cfLogicalNames.releaseCommandCustomResource(task))).toContain(
      cfLogicalNames.releaseCommandCustomResource('web')
    );
    expect(dependsOn(template, cfLogicalNames.ecsService('web', false))).toContain(
      cfLogicalNames.releaseCommandCustomResource(task)
    );
  });

  test('runs for a server-rendered site before its functions get new code', async () => {
    for (const type of ['nextjs-web', 'astro-web']) {
      const template = await synthesize({
        web: { type, properties: { appDirectory: './web', releaseCommand: 'npx prisma migrate deploy' } }
      });
      const customResource = cfLogicalNames.releaseCommandCustomResource('webReleaseTask');
      expect(template.Resources[customResource]!.Properties!.releaseCommand.taskDefinition).toEqual({
        Ref: cfLogicalNames.ecsReleaseTaskDefinition('webReleaseTask')
      });
      const functions = Object.entries(template.Resources).filter(
        ([logicalId, { Type }]) => Type === 'AWS::Lambda::Function' && /^Web/.test(logicalId)
      );
      expect(functions.length).toBeGreaterThan(0);
      for (const [logicalId] of functions) expect(dependsOn(template, logicalId)).toContain(customResource);
    }
  });

  test('holds back the edge function that serves a site', async () => {
    const template = await synthesize({
      web: {
        type: 'nextjs-web',
        properties: { appDirectory: './web', useEdgeLambda: true, releaseCommand: 'npx prisma migrate deploy' }
      }
    });
    const customResource = cfLogicalNames.releaseCommandCustomResource('webReleaseTask');
    const edgeFunctions = Object.keys(template.Resources).filter((logicalId) =>
      /^WebServerEdgeFunction.*EdgeLambda/i.test(logicalId)
    );
    expect(edgeFunctions.length).toBeGreaterThan(0);
    for (const logicalId of edgeFunctions) expect(dependsOn(template, logicalId)).toContain(customResource);
  });

  test('rejects a resource that has the name of the task', async () => {
    await expect(
      synthesize({ api: lambda({ releaseCommand: 'migrate' }), apiReleaseTask: service({}) })
    ).rejects.toThrow(/release command task of `api`/);
  });

  test('rejects a container name, because the task has one container', async () => {
    await expect(
      synthesize({ api: lambda({ releaseCommand: { command: 'migrate', container: 'main' } }) })
    ).rejects.toThrow(/runs in a task of its own/);
  });

  test('leaves a function without the setting untouched', async () => {
    const template = await synthesize({ api: lambda({}) });
    expect(Object.keys(template.Resources).filter((logicalId) => /release|ecs/i.test(logicalId))).toEqual([]);
  });
});

describe('orderReleaseCommands', () => {
  const resource = (Type: string, Properties: Record<string, unknown> = {}, DependsOn?: string[]) => ({
    Type,
    Properties,
    ...(DependsOn ? { DependsOn } : {})
  });

  test('waits for prerequisites that nothing refers to, and holds back workloads', () => {
    const template = {
      Resources: {
        Command: resource('AWS::CloudFormation::CustomResource'),
        AuroraInstance: resource('AWS::RDS::DBInstance'),
        Rule: resource('AWS::EC2::SecurityGroupIngress'),
        Service: resource('AWS::ECS::Service')
      }
    } as never;
    expect(orderReleaseCommands({ template, releaseCommands: ['Command'], heldBack: ['Service'] })).toEqual({
      notHeldBack: []
    });
    const { Resources } = template as { Resources: Record<string, Resource> };
    expect(Resources.Command!.DependsOn).toEqual(['AuroraInstance', 'Rule']);
    expect(Resources.Service!.DependsOn).toEqual(['Command']);
  });

  test('does not hold back a workload the command refers to, and reports it', () => {
    const template = {
      Resources: {
        Command: resource('AWS::CloudFormation::CustomResource', { url: { 'Fn::GetAtt': ['Function', 'Arn'] } }),
        Function: resource('AWS::Lambda::Function'),
        Service: resource('AWS::ECS::Service')
      }
    } as never;
    expect(orderReleaseCommands({ template, releaseCommands: ['Command'], heldBack: ['Service', 'Function'] })).toEqual(
      {
        notHeldBack: ['Function']
      }
    );
    expect((template as { Resources: Record<string, Resource> }).Resources.Function!.DependsOn).toBeUndefined();
  });

  test('does not wait for a prerequisite that depends on the command', () => {
    const template = {
      Resources: {
        Command: resource('AWS::CloudFormation::CustomResource'),
        Rule: resource('AWS::EC2::SecurityGroupIngress', { source: { 'Fn::Sub': '${Command.Id}' } })
      }
    } as never;
    orderReleaseCommands({ template, releaseCommands: ['Command'], heldBack: [] });
    expect((template as { Resources: Record<string, Resource> }).Resources.Command!.DependsOn).toBeUndefined();
  });

  test('refuses a dependency cycle', () => {
    const template = {
      Resources: {
        Command: resource('AWS::CloudFormation::CustomResource', { a: { Ref: 'Other' } }),
        Other: resource('AWS::SNS::Topic', { b: { Ref: 'Command' } })
      }
    } as never;
    expect(() => orderReleaseCommands({ template, releaseCommands: ['Command'], heldBack: [] })).toThrow(
      /depends on itself/
    );
  });
});
