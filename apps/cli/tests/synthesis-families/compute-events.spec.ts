import { isIntrinsic, type CloudFormationValue } from '@stacktape/cloudformation/intrinsics';
import type {
  CloudFormationTemplate,
  KnownCloudFormationResource,
  KnownCloudFormationResourceType
} from '@stacktape/cloudformation/resource';
import { describe, expect, test } from 'bun:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  BatchJob,
  DynamoDbTable,
  ScheduleIntegration,
  StateMachine,
  LambdaFunction,
  JsBundleLambdaPackaging,
  defineConfig
} from '@stacktape/config-authoring';
import { synthesizeFixture } from '../characterization/synthesis-fixture';

const fixturesDir = join(import.meta.dir, 'fixtures');
const templateOutputDirectory = process.env.STACKTAPE_SYNTHESIS_FAMILY_TEMPLATE_OUTPUT_DIR;

const authoringParams: Parameters<ReturnType<typeof defineConfig>>[0] = {
  projectName: 'characterization',
  stage: 'baseline',
  region: 'eu-west-1',
  cliArgs: {} as never,
  command: 'synth',
  awsProfile: '',
  user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
};

const synthesizeFamily = async (family: string, definedConfig: ReturnType<typeof defineConfig>) => {
  const template = await synthesizeFixture({ compiledConfig: definedConfig(authoringParams), workingDir: fixturesDir });
  if (templateOutputDirectory) {
    await mkdir(templateOutputDirectory, { recursive: true });
    await writeFile(join(templateOutputDirectory, `${family}.json`), `${JSON.stringify(template, null, 2)}\n`);
  }
  return template;
};

const resourcesOfType = <Type extends KnownCloudFormationResourceType>(template: CloudFormationTemplate, type: Type) =>
  Object.entries(template.Resources).filter(([, resource]) => resource.Type === type) as [
    string,
    KnownCloudFormationResource<Type>
  ][];

const onlyResourceOfType = <Type extends KnownCloudFormationResourceType>(
  template: CloudFormationTemplate,
  type: Type
) => {
  const matches = resourcesOfType(template, type);
  expect(matches.map(([logicalId]) => logicalId)).toHaveLength(1);
  return { logicalId: matches[0][0], resource: matches[0][1] };
};

const json = (value: unknown) => JSON.stringify(value);
const literal = <Value>(value: CloudFormationValue<Value>): Value => {
  if (isIntrinsic(value)) throw new Error('Expected a literal synthesized property');
  return value as Value;
};

/** Every `Ref` and `Fn::GetAtt` target in the template must exist as a resource or a parameter; cfn-lint also checks it, this keeps the failure readable. */
const expectReferencesResolve = (template: CloudFormationTemplate) => {
  const known = new Set([...Object.keys(template.Resources), ...Object.keys(template.Parameters ?? {})]);
  const pseudo = (name: string) => name.startsWith('AWS::');
  const missing = new Set<string>();
  const walk = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    if (typeof record.Ref === 'string' && !pseudo(record.Ref) && !known.has(record.Ref)) missing.add(record.Ref);
    const getAtt = record['Fn::GetAtt'];
    if (Array.isArray(getAtt) && typeof getAtt[0] === 'string' && !known.has(getAtt[0])) missing.add(getAtt[0]);
    Object.values(record).forEach(walk);
  };
  walk(template.Resources);
  walk(template.Outputs);
  expect([...missing]).toEqual([]);
};

/** Flattened IAM statements of a role, so a permission can be asserted regardless of policy grouping. */
const roleStatements = (template: CloudFormationTemplate, roleLogicalId: string) => {
  const role = template.Resources[roleLogicalId];
  expect(role?.Type).toBe('AWS::IAM::Role');
  const properties = role.Properties as {
    Policies?: { PolicyDocument: { Statement: { Action: string | string[]; Resource: unknown }[] } }[];
  };
  return (properties.Policies ?? []).flatMap(
    (policy: { PolicyDocument: { Statement: { Action: string | string[]; Resource: unknown }[] } }) =>
      policy.PolicyDocument.Statement.map((statement) => ({
        actions: [statement.Action].flat(),
        resource: json(statement.Resource)
      }))
  ) as { actions: string[]; resource: string }[];
};

describe('Batch and Step Functions family', () => {
  const config = (invalidSchedule = false) =>
    defineConfig(() => {
      const results = new DynamoDbTable({ primaryKey: { partitionKey: { name: 'id', type: 'string' } } });
      const report = new BatchJob({
        container: {
          packaging: {
            type: 'prebuilt-image',
            properties: { image: 'example.invalid/reports:v1', command: ['node', 'report.js'] }
          },
          environment: { REPORT_FORMAT: 'json' }
        },
        resources: { cpu: 2, memory: 3840 },
        useSpotInstances: true,
        timeout: 600,
        retryConfig: { attempts: 3, retryIntervalSeconds: 5, retryIntervalMultiplier: 2 },
        connectTo: [results],
        events: [
          new ScheduleIntegration({
            scheduleRate: 'rate(1 hour)',
            input: '{"report":"daily"}',
            ...(invalidSchedule ? { inputPath: '$.detail' } : {})
          })
        ]
      });
      const notify = new LambdaFunction({
        packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/handler.ts' })
      });
      const workflow = new StateMachine({
        definition: {
          StartAt: 'Notify',
          States: {
            Notify: {
              Type: 'Task',
              Resource: { 'Fn::GetAtt': ['NotifyFunction', 'Arn'] },
              Retry: [{ ErrorEquals: ['States.TaskFailed'], IntervalSeconds: 2, MaxAttempts: 2 }],
              Catch: [{ ErrorEquals: ['States.ALL'], Next: 'Failed' }],
              End: true
            },
            Failed: { Type: 'Fail', Error: 'NotificationFailed' }
          }
        }
      });
      return { resources: { results, report, notify, workflow } };
    });

  test('a scheduled report reaches its Batch workflow, retries on Spot and receives only its connected table access', async () => {
    const template = await synthesizeFamily('batch-and-state-machines', config());
    expectReferencesResolve(template);
    const job = onlyResourceOfType(template, 'AWS::Batch::JobDefinition');
    // A prebuilt image may bring its own init; only Stacktape's js-bundle images get Batch's.
    expect(literal(job.resource.Properties.ContainerProperties).LinuxParameters).toBeUndefined();
    expect(job.resource.Properties?.ContainerProperties).toMatchObject({
      Command: ['node', 'report.js'],
      Image: 'example.invalid/reports:v1',
      Vcpus: 2,
      Memory: 3840,
      Environment: expect.arrayContaining([{ Name: 'REPORT_FORMAT', Value: 'json' }])
    });
    const stateMachines = resourcesOfType(template, 'AWS::StepFunctions::StateMachine');
    expect(stateMachines).toHaveLength(2);
    const batch = stateMachines.find(([, resource]) => resource.Properties?.DefinitionString)!;
    const definition = JSON.parse(batch[1].Properties?.DefinitionString as string) as {
      StartAt: string;
      States: Record<
        string,
        { Type?: string; Seconds?: number; Resource?: string; Parameters?: unknown; Next: string; Catch?: unknown }
      >;
    };
    expect(definition.StartAt).toBe('spot1');
    for (const attempt of [1, 2, 3]) {
      const task = definition.States[`spot${attempt}`];
      expect(task.Resource).toBe('arn:aws:states:::batch:submitJob.sync');
      expect(task.Parameters).toMatchObject({
        JobDefinition:
          'arn:aws:batch:eu-west-1:123456789999:job-definition/characterization-baseline-report-job-definition',
        JobQueue: 'arn:aws:batch:eu-west-1:123456789999:job-queue/characterization-baseline-batch-spot--job-queue',
        'JobName.$': '$.jobName',
        Timeout: { AttemptDurationSeconds: 600 },
        ContainerOverrides: {
          Environment: expect.arrayContaining([
            { Name: 'STP_TRIGGER_EVENT_DATA', 'Value.$': '$.triggerEvent' },
            { Name: 'STP_CURRENT_ATTEMPT', Value: String(attempt) },
            { Name: 'STP_MAXIMUM_ATTEMPTS', Value: '3' }
          ])
        }
      });
      expect(task.Next).toBe('succeed');
      expect(task.Catch).toEqual([
        { ErrorEquals: ['States.ALL'], Next: attempt === 3 ? 'fail' : `wait${attempt}`, ResultPath: '$.error-info' }
      ]);
    }
    expect(definition.States.wait1).toEqual({ Type: 'Wait', Seconds: 10, Next: 'spot2' });
    expect(definition.States.wait2).toEqual({ Type: 'Wait', Seconds: 20, Next: 'spot3' });
    const queue = resourcesOfType(template, 'AWS::Batch::JobQueue').find(
      ([, resource]) => resource.Properties?.JobQueueName === 'characterization-baseline-batch-spot--job-queue'
    )!;
    const compute = template.Resources[
      queue[1].Properties?.ComputeEnvironmentOrder[0].ComputeEnvironment.Ref
    ] as KnownCloudFormationResource<'AWS::Batch::ComputeEnvironment'>;
    expect(literal(compute.Properties.ComputeResources).Type).toBe('SPOT');
    expect(batch[1].DependsOn).toEqual(expect.arrayContaining([job.logicalId, queue[0]]));

    const trigger = resourcesOfType(template, 'AWS::Lambda::Function').find(([id]) => id.startsWith('Report'))!;
    expect(literal(literal(trigger[1].Properties.Environment).Variables).STATE_MACHINE_ARN).toEqual({ Ref: batch[0] });
    const rule = resourcesOfType(template, 'AWS::Events::Rule').find(
      ([, resource]) => resource.Properties?.ScheduleExpression === 'rate(1 hour)'
    )!;
    // A new rule names the function by ARN, so CloudFormation creates it (about a minute) alongside the function. Its
    // permission still references both, so nothing invokes the function before it exists.
    expect(rule[1].Properties).toMatchObject({
      ScheduleExpression: 'rate(1 hour)',
      Targets: [
        expect.objectContaining({
          Arn: {
            'Fn::Sub': `arn:\${AWS::Partition}:lambda:\${AWS::Region}:\${AWS::AccountId}:function:${literal(trigger[1].Properties.FunctionName)}`
          },
          Input: { 'Fn::Sub': '{"report":"daily"}' }
        })
      ]
    });
    expect(
      resourcesOfType(template, 'AWS::Lambda::Permission').find(
        ([, resource]) => json(resource.Properties?.SourceArn) === json({ 'Fn::GetAtt': [rule[0], 'Arn'] })
      )?.[1].Properties?.FunctionName
    ).toEqual({ 'Fn::GetAtt': [trigger[0], 'Arn'] });
    expect(
      roleStatements(template, trigger[1].Properties?.Role['Fn::GetAtt'][0]).filter(({ actions }) =>
        actions.includes('states:StartExecution')
      )
    ).toEqual([{ actions: ['states:StartExecution'], resource: json([{ Ref: batch[0] }]) }]);
    const jobRole = literal(job.resource.Properties.ContainerProperties).JobRoleArn['Fn::GetAtt'][0];
    const tableAccess = roleStatements(template, jobRole).filter(({ actions }) =>
      actions.some((action) => action.startsWith('dynamodb:'))
    );
    expect(tableAccess.length).toBeGreaterThan(0);
    expect(
      tableAccess.every(({ resource }) => resource.includes('ResultsGlobalTable') && !resource.includes('"*"'))
    ).toBe(true);
    const workflow = stateMachines.find(([, resource]) => resource.Properties?.Definition)!;
    expect(workflow[1].Properties?.Definition).toEqual({
      StartAt: 'Notify',
      States: {
        Notify: {
          Type: 'Task',
          Resource: { 'Fn::GetAtt': ['NotifyFunction', 'Arn'] },
          Retry: [{ ErrorEquals: ['States.TaskFailed'], IntervalSeconds: 2, MaxAttempts: 2 }],
          Catch: [{ ErrorEquals: ['States.ALL'], Next: 'Failed' }],
          End: true
        },
        Failed: { Type: 'Fail', Error: 'NotificationFailed' }
      }
    });
    expect(
      roleStatements(template, workflow[1].Properties?.RoleArn['Fn::GetAtt'][0]).find(({ actions }) =>
        actions.includes('lambda:InvokeFunction')
      )?.resource
    ).toBe(json('arn:aws:lambda:eu-west-1:123456789999:function:characterization-baseline*'));
  });

  test("Batch starts the init process in Stacktape's js-bundle images", async () => {
    const template = await synthesizeFamily(
      'batch-js-bundle-init',
      defineConfig(() => ({
        resources: {
          report: new BatchJob({
            container: { packaging: { type: 'js-bundle', properties: { entryfilePath: './src/handler.ts' } } },
            resources: { cpu: 1, memory: 2048 }
          })
        }
      }))
    );
    const job = onlyResourceOfType(template, 'AWS::Batch::JobDefinition');
    expect(literal(job.resource.Properties.ContainerProperties).LinuxParameters).toEqual({ InitProcessEnabled: true });
  });

  describe('compute environment images', () => {
    const jobs = defineConfig(() => ({
      resources: {
        report: new BatchJob({
          container: {
            packaging: { type: 'prebuilt-image', properties: { image: 'example.invalid/reports:v1' } }
          },
          resources: { cpu: 1, memory: 2048 }
        }),
        train: new BatchJob({
          container: {
            packaging: { type: 'prebuilt-image', properties: { image: 'example.invalid/train:v1' } }
          },
          resources: { cpu: 8, memory: 30720, gpu: 1 }
        })
      }
    }));
    const synthesize = (deployedTemplate?: CloudFormationTemplate) =>
      synthesizeFixture({ compiledConfig: jobs(authoringParams), workingDir: fixturesDir, deployedTemplate });
    const imageTypes = (template: CloudFormationTemplate) =>
      Object.fromEntries(
        resourcesOfType(template, 'AWS::Batch::ComputeEnvironment').map(([logicalId, resource]) => [
          logicalId,
          json(literal(resource.Properties.ComputeResources).Ec2Configuration)
        ])
      );
    /** The template as a stack deployed before Batch stopped creating Amazon Linux 2 environments has it. */
    const deployedWithAmazonLinux2 = (template: CloudFormationTemplate) => {
      const deployed = structuredClone(template);
      for (const [, resource] of resourcesOfType(deployed, 'AWS::Batch::ComputeEnvironment')) {
        const computeResources = literal(resource.Properties.ComputeResources);
        const [{ ImageType }] = literal(computeResources.Ec2Configuration) as [{ ImageType: string }];
        computeResources.Ec2Configuration = [{ ImageType: ImageType.replace('AL2023', 'AL2') }];
      }
      return deployed;
    };

    test('new compute environments use Amazon Linux 2023, with the NVIDIA image for GPU jobs', async () => {
      const template = await synthesize();
      expect(imageTypes(template)).toEqual({
        StpBatchOnDemandComputeEnvironment: json([{ ImageType: 'ECS_AL2023' }]),
        StpBatchSpotComputeEnvironment: json([{ ImageType: 'ECS_AL2023' }]),
        StpBatchOnDemandGpuComputeEnvironment: json([{ ImageType: 'ECS_AL2023_NVIDIA' }]),
        StpBatchSpotGpuComputeEnvironment: json([{ ImageType: 'ECS_AL2023_NVIDIA' }])
      });
      // The launch template enlarges the root volume, which every Amazon Linux 2023 ECS image names /dev/xvda.
      const launchTemplate = onlyResourceOfType(template, 'AWS::EC2::LaunchTemplate');
      expect(json(launchTemplate.resource.Properties.LaunchTemplateData)).toContain('"DeviceName":"/dev/xvda"');
    });

    test('deployed Amazon Linux 2 compute environments are not replaced while nothing else changes', async () => {
      const deployed = deployedWithAmazonLinux2(await synthesize());
      const template = await synthesize(deployed);
      for (const [logicalId, resource] of resourcesOfType(template, 'AWS::Batch::ComputeEnvironment')) {
        expect(resource.Properties).toEqual(deployed.Resources[logicalId].Properties as never);
      }
      expect(imageTypes(template).StpBatchSpotGpuComputeEnvironment).toBe(json([{ ImageType: 'ECS_AL2_NVIDIA' }]));
    });

    test('a deployed compute environment that is replaced anyway moves to Amazon Linux 2023', async () => {
      const deployed = deployedWithAmazonLinux2(await synthesize());
      // Changed stack tags replace a compute environment; AWS would reject the replacement with Amazon Linux 2.
      literal(
        literal(deployed.Resources.StpBatchOnDemandComputeEnvironment.Properties as { Tags: Record<string, string> })
          .Tags
      ).team = 'data';
      const template = await synthesize(deployed);
      expect(imageTypes(template)).toEqual({
        StpBatchOnDemandComputeEnvironment: json([{ ImageType: 'ECS_AL2023' }]),
        StpBatchSpotComputeEnvironment: json([{ ImageType: 'ECS_AL2' }]),
        StpBatchOnDemandGpuComputeEnvironment: json([{ ImageType: 'ECS_AL2_NVIDIA' }]),
        StpBatchSpotGpuComputeEnvironment: json([{ ImageType: 'ECS_AL2_NVIDIA' }])
      });
    });
  });

  test('rejects a scheduled Batch trigger with competing input and inputPath', async () => {
    await expect(synthesizeFamily('invalid-batch-schedule', config(true))).rejects.toMatchObject({
      code: 'CONFIG_SCHEDULE_INPUT_CONFLICT'
    });
  });
});
