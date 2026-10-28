import { expect, test } from 'bun:test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  $ResourceParam,
  defineConfig,
  EmailSender,
  JsBundleLambdaPackaging,
  LambdaFunction,
  RdsEnginePostgres,
  RedisCluster,
  RelationalDatabase,
  HostingBucket,
  MultiContainerWorkload,
  JsBundleImagePackaging,
  BuildpackImagePackaging,
  BatchJob,
  Bucket,
  RdsEngineMysql,
  LocalScript,
  SvelteKitWeb,
  PrivateService,
  WebService,
  WorkerService,
  type CompiledStacktapeConfig
} from '@stacktape/config-authoring';
import { configManager } from '../../src/domain/config-manager';
import { deploymentArtifactManager } from '../../src/domain/deployment-artifact-manager';
import { packagingManager } from '../../src/domain/packaging-manager';
import { assertNoUnresolvedPlaceholders, findUnresolvedPlaceholders } from '../../src/domain/template-manager/finalize';
import { getDevNetworkDemand } from '../../src/commands/dev/dev-network-session';
import { getDevStackConfigFingerprint } from '../../src/commands/dev/dev-stack-config-fingerprint';
import { synthesizeFixture } from './synthesis-fixture';

test('local API and UI synthesize support infrastructure without a second data plane', async () => {
  const input = process.env.STACKTAPE_TEST_COMPILED_CONFIG;
  const compiledConfig: CompiledStacktapeConfig = input
    ? JSON.parse(await readFile(input, 'utf8'))
    : defineConfig(() => {
        const sender = new EmailSender({ identity: 'example.com', manageIdentity: false });
        const api = new MultiContainerWorkload({
          containers: [
            {
              name: 'api',
              packaging: new JsBundleImagePackaging({ entryfilePath: './src/api.ts' }),
              environment: { PORT: '3000' }
            }
          ],
          resources: { cpu: 0.5, memory: 1024 },
          connectTo: [sender]
        });
        const ui = new HostingBucket({ uploadDirectoryPath: './dist', dev: { command: 'node index.ts' } });
        // Every service type runs locally in dev. Deployed, a web service needs an HTTP API VPC link and a private
        // service a service-discovery namespace, both in a VPC the dev stack does not create; a worker would add its
        // ECS service. One of each proves the dev-mode selection per type.
        const web = new WebService({
          packaging: new JsBundleImagePackaging({ entryfilePath: './src/web.ts' }),
          resources: { cpu: 0.25, memory: 512 }
        });
        const internal = new PrivateService({
          packaging: new JsBundleImagePackaging({ entryfilePath: './src/api.ts' }),
          resources: { cpu: 0.25, memory: 512 }
        });
        const worker = new WorkerService({
          packaging: new JsBundleImagePackaging({ entryfilePath: './src/worker.ts' }),
          resources: { cpu: 0.25, memory: 512 }
        });
        return { resources: { api, ui, sender, web, internal, worker } };
      })({
        projectName: 'characterization',
        stage: 'baseline',
        region: 'eu-west-1',
        command: 'dev',
        awsProfile: '',
        cliArgs: {}
      });

  const template = await synthesizeFixture({
    compiledConfig,
    command: 'dev',
    workingDir: process.env.STACKTAPE_TEST_CONFIG_DIRECTORY || join(import.meta.dir, 'fixtures', 'dense-application')
  });
  const resources = Object.values(template.Resources);
  expect(resources.length).toBeGreaterThan(0);
  const allowedTypes = new Set([
    'AWS::IAM::Role',
    'AWS::S3::Bucket',
    'AWS::S3::BucketPolicy',
    'AWS::ECR::Repository',
    'AWS::Logs::LogGroup',
    'AWS::Lambda::Function',
    'AWS::Events::Rule',
    'AWS::Lambda::Permission',
    'AWS::CloudFormation::CustomResource'
  ]);
  for (const [id, resource] of Object.entries(template.Resources)) {
    expect(allowedTypes.has(resource.Type), `${id}: ${resource.Type}`).toBe(true);
    if (resource.Type === 'AWS::Lambda::Function') expect(id).toBe('StacktapeServiceLambdaCustomResourceFunction');
  }
  // IAM and custom-resource payloads must not reference the VPC omitted for local workloads.
  expect(JSON.stringify(template)).not.toContain('"Ref":"StpVpc"');
  const output = process.env.STACKTAPE_TEST_SUPPORT_TEMPLATE;
  if (output) await writeFile(output, JSON.stringify(template));
});

test('dev functions that need the dev box run in the shared dev network with relay addresses', async () => {
  const relayHost = '10.230.0.10';
  const devNetwork = {
    subnetIds: ['subnet-private-a', 'subnet-private-b'],
    securityGroupId: 'sg-dev-lambdas',
    functions: { api: ['db', 'cache'], egress: [] },
    localResources: {
      db: {
        params: {
          host: relayHost,
          port: '20123',
          connectionString: `postgresql://postgres:<password>@${relayHost}:20123/app`
        },
        environment: {}
      },
      cache: {
        params: { host: relayHost, port: '20456', connectionString: `redis://${relayHost}:20456` },
        environment: {}
      }
    }
  };
  const compiledConfig = defineConfig(() => {
    const db = new RelationalDatabase({
      credentials: { masterUserPassword: 'deployed-only' },
      engine: new RdsEnginePostgres({ version: '16.4', primaryInstance: { instanceSize: 'db.t3.micro' } })
    });
    const cache = new RedisCluster({ instanceSize: 'cache.t3.micro', defaultUserPassword: 'deployed-only-password' });
    const packaging = new JsBundleLambdaPackaging({ entryfilePath: './src/api.ts' });
    // `api` reaches both local databases, `egress` is a VPC function that only needs the box's NAT, `plain` needs neither.
    const api = new LambdaFunction({
      packaging,
      connectTo: [db],
      environment: { CACHE_URL: $ResourceParam('cache', 'connectionString') }
    });
    const egress = new LambdaFunction({ packaging, joinDefaultVpc: true });
    const plain = new LambdaFunction({ packaging });
    return { resources: { db, cache, api, egress, plain } };
  })({
    projectName: 'characterization',
    stage: 'baseline',
    region: 'eu-west-1',
    command: 'dev',
    awsProfile: '',
    cliArgs: {}
  });
  const template = await synthesizeFixture({
    compiledConfig,
    command: 'dev',
    devNetwork,
    workingDir: join(import.meta.dir, 'fixtures', 'dense-application')
  });
  const functionOf = (name: string) =>
    Object.values(template.Resources).find(
      (resource) =>
        resource.Type === 'AWS::Lambda::Function' &&
        (resource.Properties as { FunctionName?: string }).FunctionName === `characterization-baseline-${name}`
    )?.Properties as { VpcConfig?: unknown; Environment?: { Variables: Record<string, string> } };
  const shared = { SecurityGroupIds: ['sg-dev-lambdas'], SubnetIds: ['subnet-private-a', 'subnet-private-b'] };
  expect(functionOf('api').VpcConfig).toEqual(shared);
  expect(functionOf('egress').VpcConfig).toEqual(shared);
  expect(functionOf('plain').VpcConfig).toBeUndefined();
  // connectTo injects the relay address under the usual names; $ResourceParam resolves to it as well.
  expect(functionOf('api').Environment?.Variables).toMatchObject({
    STP_DB_CONNECTION_STRING: `postgresql://postgres:<password>@${relayHost}:20123/app`,
    STP_DB_HOST: relayHost,
    STP_DB_PORT: '20123',
    CACHE_URL: `redis://${relayHost}:20456`
  });
  // The placement above is what `stacktape dev` derives from this config: the VPC function and the function that uses
  // local databases join, the plain one does not; without tunnels only the VPC function does.
  expect(getDevNetworkDemand({ noTunnel: false })).toEqual({
    functions: devNetwork.functions,
    batchJobs: undefined,
    unreachable: []
  });
  expect(getDevNetworkDemand({ noTunnel: true })).toEqual({
    functions: { egress: [] },
    batchJobs: undefined,
    unreachable: []
  });
  // No VPC, NAT or per-function security group of the stack's own: the dev network has them.
  const types = Object.values(template.Resources).map(({ Type }) => Type);
  expect(types.filter((type) => type.startsWith('AWS::EC2::'))).toEqual([]);
  expect(JSON.stringify(template)).not.toContain('"Ref":"StpVpc"');
});

test('dev stacks leave out alarms, and their schedule rules do not wait for the function', async () => {
  const compile = (command: 'dev' | 'synth') =>
    defineConfig(() => {
      const worker = new LambdaFunction({
        packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/api.ts' }),
        events: [{ type: 'schedule', properties: { scheduleRate: 'rate(2 minutes)' } }],
        alarms: [{ trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 5 } } }]
      });
      return { resources: { worker } };
    })({
      projectName: 'characterization',
      stage: 'baseline',
      region: 'eu-west-1',
      command,
      awsProfile: '',
      cliArgs: {}
    });
  const synthesize = (command: 'dev' | 'synth', deployedTemplate?: Awaited<ReturnType<typeof synthesizeFixture>>) =>
    synthesizeFixture({
      compiledConfig: compile(command),
      command,
      workingDir: join(import.meta.dir, 'fixtures', 'dense-application'),
      deployedTemplate
    });
  const scheduleRuleTarget = (template: Awaited<ReturnType<typeof synthesize>>) =>
    Object.values(template.Resources)
      .filter(({ Type }) => Type === 'AWS::Events::Rule')
      .map(({ Properties }) => Properties as { ScheduleExpression?: string; Targets: Array<{ Arn: unknown }> })
      .find(({ ScheduleExpression }) => ScheduleExpression === 'rate(2 minutes)')?.Targets[0].Arn;

  const deployed = await synthesize('synth');
  const deployedTypes = Object.values(deployed.Resources).map(({ Type }) => Type);
  expect(deployedTypes).toContain('AWS::CloudWatch::Alarm');
  expect(deployedTypes.filter((type) => type === 'AWS::Events::Rule')).toHaveLength(2);
  const byArn = {
    'Fn::Sub': 'arn:${AWS::Partition}:lambda:${AWS::Region}:${AWS::AccountId}:function:characterization-baseline-worker'
  };
  // A new stack's rule names the function by ARN too; a rule deployed with a reference keeps it, so it is not updated.
  expect(scheduleRuleTarget(deployed)).toEqual(byArn);
  const referenced = structuredClone(deployed);
  const referencedRule = Object.values(referenced.Resources).find(
    ({ Properties }) => (Properties as { ScheduleExpression?: string })?.ScheduleExpression === 'rate(2 minutes)'
  )!.Properties as { Targets: Array<{ Arn: unknown }> };
  referencedRule.Targets[0].Arn = { 'Fn::GetAtt': ['WorkerFunction', 'Arn'] };
  expect(scheduleRuleTarget(await synthesize('synth', referenced))).toEqual({
    'Fn::GetAtt': ['WorkerFunction', 'Arn']
  });
  expect(scheduleRuleTarget(await synthesize('synth', deployed))).toEqual(byArn);

  // The r2p dogfood run: each alarm's notification rule took 61 s at the end of every new dev stage, and the alarms
  // would have notified about errors an agent caused on purpose.
  const dev = await synthesize('dev');
  const devTypes = Object.values(dev.Resources).map(({ Type }) => Type);
  expect(devTypes).not.toContain('AWS::CloudWatch::Alarm');
  expect(devTypes.filter((type) => type === 'AWS::Events::Rule')).toHaveLength(1);
  expect(JSON.stringify(dev)).not.toContain('AlarmNotification');
  // The rule names the function by ARN, so CloudFormation creates it while it creates the function.
  expect(scheduleRuleTarget(dev)).toEqual(byArn);
});

// Fifth dogfood (r2cc): changing a local container's startCommand updated every function of the dev stack. A change
// that only the local session uses must keep the fingerprint, and it may only do so because the dev stack's template
// stays the same; a change that reaches the template must change the fingerprint (a skipped update is a false green).
test('only changes that reach the dev stack template change its fingerprint', async () => {
  type Variant = {
    startCommand?: string;
    devCommand?: string;
    seedCommand?: string;
    apiConnectsToBucket?: boolean;
    workerEnvironment?: string;
  };
  const synthesize = async ({
    startCommand = 'uvicorn main:app',
    devCommand = 'npm run dev',
    seedCommand = 'npm run seed',
    apiConnectsToBucket = false,
    workerEnvironment = 'one'
  }: Variant = {}) => {
    const compiledConfig = defineConfig(() => {
      const worker = new LambdaFunction({
        packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/worker.ts' }),
        environment: { MODE: workerEnvironment }
      });
      const files = new Bucket({});
      const api = new WebService({
        packaging: new BuildpackImagePackaging({ sourceDirectoryPath: './src', startCommand }),
        resources: { cpu: 0.25, memory: 512 },
        connectTo: apiConnectsToBucket ? [files] : []
      });
      const web = new SvelteKitWeb({ appDirectory: './src', dev: { command: devCommand } });
      const seed = new LocalScript({ executeCommand: seedCommand });
      return { resources: { worker, files, api, web }, scripts: { seed } };
    })({
      projectName: 'characterization',
      stage: 'baseline',
      region: 'eu-west-1',
      command: 'dev',
      awsProfile: '',
      cliArgs: {}
    });
    const template = await synthesizeFixture({
      compiledConfig,
      command: 'dev',
      workingDir: join(import.meta.dir, 'fixtures', 'dense-application')
    });
    return {
      template: JSON.stringify(template),
      fingerprint: getDevStackConfigFingerprint({ config: configManager.config })
    };
  };

  const base = await synthesize();
  for (const localOnly of [
    { startCommand: 'alembic upgrade head && uvicorn main:app' },
    { devCommand: 'vite dev --port 5174' },
    { seedCommand: 'python seed.py' }
  ]) {
    const changed = await synthesize(localOnly);
    expect({ localOnly, sameTemplate: changed.template === base.template }).toEqual({ localOnly, sameTemplate: true });
    expect(changed.fingerprint).toBe(base.fingerprint);
  }
  for (const needed of [{ apiConnectsToBucket: true }, { workerEnvironment: 'two' }]) {
    const changed = await synthesize(needed);
    expect({ needed, sameTemplate: changed.template === base.template }).toEqual({ needed, sameTemplate: false });
    expect(changed.fingerprint).not.toBe(base.fingerprint);
  }
});

// Seventh dogfood (r2ll): `stacktape dev` skipped every container build, so the dev stack deployed the report job's
// definition with `Image: <<not-yet-known>>` and AWS Batch rejected the job. Its compute environments also ran in a VPC
// of the stack, from which the job could not have reached the local MySQL database through the dev box.
test('a dev stack builds the image of its batch job and runs the job in the dev network with relay addresses', async () => {
  const relayHost = '10.230.0.10';
  const relayed = `mysql://stacktape:<password>@${relayHost}:20321/app`;
  const devNetwork = {
    subnetIds: ['subnet-private-a', 'subnet-private-b'],
    securityGroupId: 'sg-dev-lambdas',
    functions: { quote: ['db'] },
    batchJobs: { report: ['db'] },
    localResources: {
      db: { params: { host: relayHost, port: '20321', connectionString: relayed }, environment: {} }
    }
  };
  const compiledConfig = defineConfig(() => {
    const db = new RelationalDatabase({
      credentials: { masterUserPassword: 'deployed-only' },
      engine: new RdsEngineMysql({ version: '8.4.8', primaryInstance: { instanceSize: 'db.t4g.micro' } })
    });
    const reports = new Bucket({});
    const report = new BatchJob({
      container: {
        packaging: new BuildpackImagePackaging({ sourceDirectoryPath: './src', startCommand: 'node report.js' }),
        environment: { DATABASE_URL: $ResourceParam('db', 'connectionString') }
      },
      resources: { cpu: 1, memory: 512 },
      connectTo: [db, reports]
    });
    const quote = new LambdaFunction({
      packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/api.ts' }),
      connectTo: [db]
    });
    // Runs on the developer's machine: dev mode builds its image there, not for AWS.
    const api = new WebService({
      packaging: new JsBundleImagePackaging({ entryfilePath: './src/web.ts' }),
      resources: { cpu: 0.25, memory: 512 },
      connectTo: [db]
    });
    return { resources: { db, reports, report, quote, api } };
  })({
    projectName: 'characterization',
    stage: 'baseline',
    region: 'eu-west-1',
    command: 'dev',
    awsProfile: '',
    cliArgs: {}
  });
  const synthesize = (imageBuilt: boolean) =>
    synthesizeFixture({
      compiledConfig,
      command: 'dev',
      devNetwork,
      workingDir: join(import.meta.dir, 'fixtures', 'dense-application'),
      beforeFinalize: () => {
        if (!imageBuilt) return;
        // What a build of the report image records; the image is pushed under the tag derived from its digest.
        deploymentArtifactManager.setPackagingSource({
          getPackagingOutputForJob: (jobName: string) =>
            jobName === reportJob ? { jobName, digest: 'reportdigest', skipped: false, size: 1 } : null,
          getPendingSharedLayer: () => packagingManager.getPendingSharedLayer(),
          getLayerArtifacts: () => packagingManager.getLayerArtifacts(),
          getLayerArtifact: (...args: Parameters<typeof packagingManager.getLayerArtifact>) =>
            packagingManager.getLayerArtifact(...args),
          getLayerNumbersForLambda: (...args: Parameters<typeof packagingManager.getLayerNumbersForLambda>) =>
            packagingManager.getLayerNumbersForLambda(...args),
          publishSharedLayer: (...args: Parameters<typeof packagingManager.publishSharedLayer>) =>
            packagingManager.publishSharedLayer(...args)
        } as Parameters<typeof deploymentArtifactManager.setPackagingSource>[0]);
      }
    });
  const reportJob = 'report-default';

  const template = await synthesize(true);
  // `stacktape dev` derives the placement above from this config, and builds only the image AWS pulls.
  expect(getDevNetworkDemand({ noTunnel: false })).toEqual({
    functions: devNetwork.functions,
    batchJobs: devNetwork.batchJobs,
    unreachable: []
  });
  expect(configManager.imageJobNamesToPackage).toEqual([configManager.allBatchJobContainers[0]!.jobName]);
  expect(configManager.allBatchJobContainers[0]!.jobName).toBe(reportJob);

  const resourcesOfType = (type: string) =>
    Object.entries(template.Resources).filter(([, resource]) => resource.Type === type) as [
      string,
      { Properties: Record<string, any>; DependsOn?: unknown }
    ][];
  const computeEnvironments = resourcesOfType('AWS::Batch::ComputeEnvironment');
  expect(computeEnvironments.length).toBeGreaterThan(0);
  for (const [, environment] of computeEnvironments) {
    expect(environment.Properties.ComputeResources.Subnets).toEqual(devNetwork.subnetIds);
    expect(environment.Properties.ComputeResources.SecurityGroupIds).toEqual([devNetwork.securityGroupId]);
    expect(environment.DependsOn).toBeUndefined();
  }
  // The dev network replaces the VPC the stack would create for its batch jobs: nothing refers to a resource of it.
  expect(resourcesOfType('AWS::EC2::SecurityGroup')).toEqual([]);
  expect(
    Object.entries(template.Resources)
      .filter(([, resource]) =>
        /"(Ref|Fn::GetAtt)":\[?"Stp(Vpc|PublicSubnet|PrivateSubnet)/.test(JSON.stringify(resource))
      )
      .map(([logicalId]) => logicalId)
  ).toEqual([]);

  const [[, jobDefinition]] = resourcesOfType('AWS::Batch::JobDefinition');
  const container = jobDefinition.Properties.ContainerProperties;
  expect(container.Image).toStartWith(`${deploymentArtifactManager.repositoryUrl}:report-default`);
  expect(container.Image).toContain('reportdigest');
  const environment = Object.fromEntries(
    (container.Environment as { Name: string; Value: string }[]).map(({ Name, Value }) => [Name, Value])
  );
  expect(environment).toMatchObject({
    DATABASE_URL: relayed,
    STP_DB_CONNECTION_STRING: relayed,
    STP_DB_HOST: relayHost,
    STP_DB_PORT: '20321'
  });
  expect(environment.STP_REPORTS_NAME).toBeDefined();
  expect(findUnresolvedPlaceholders(template)).toEqual([]);

  // Without the build the placeholder stays, and the deploy refuses the template before CloudFormation sees it.
  const unbuilt = await synthesize(false);
  const [[jobDefinitionId]] = Object.entries(unbuilt.Resources).filter(
    ([, resource]) => resource.Type === 'AWS::Batch::JobDefinition'
  );
  expect(findUnresolvedPlaceholders(unbuilt)).toEqual([
    `Resources.${jobDefinitionId}.Properties.ContainerProperties.Image`
  ]);
  expect(() => assertNoUnresolvedPlaceholders(unbuilt)).toThrow(
    expect.objectContaining({ code: 'TEMPLATE_UNRESOLVED_PLACEHOLDER' })
  );
});

test('batch jobs stay in the stack VPC when the dev stack deploys VPC resources of its own', async () => {
  const compiledConfig = defineConfig(() => {
    const db = new RelationalDatabase({
      credentials: { masterUserPassword: 'deployed-only' },
      engine: new RdsEngineMysql({ version: '8.4.8', primaryInstance: { instanceSize: 'db.t4g.micro' } }),
      accessibility: { accessibilityMode: 'vpc' }
    });
    const cache = new RedisCluster({ instanceSize: 'cache.t3.micro', defaultUserPassword: 'deployed-only-password' });
    const report = new BatchJob({
      container: {
        packaging: new BuildpackImagePackaging({ sourceDirectoryPath: './src', startCommand: 'node report.js' })
      },
      resources: { cpu: 1, memory: 512 },
      connectTo: [db, cache]
    });
    return { resources: { db, cache, report } };
  })({
    projectName: 'characterization',
    stage: 'baseline',
    region: 'eu-west-1',
    command: 'dev',
    awsProfile: '',
    cliArgs: {}
  });
  await synthesizeFixture({
    compiledConfig,
    command: 'dev',
    remoteResources: ['db'],
    workingDir: join(import.meta.dir, 'fixtures', 'dense-application')
  });
  // The remote database is in the stack's VPC, so the job stays there and cannot reach the local Redis.
  expect(getDevNetworkDemand({ noTunnel: false })).toEqual({
    functions: {},
    batchJobs: undefined,
    unreachable: [{ kind: 'Batch job', name: 'report', resources: ['cache'] }]
  });
});
