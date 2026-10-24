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
  PrivateService,
  WebService,
  WorkerService,
  type CompiledStacktapeConfig
} from '@stacktape/config-authoring';
import { getDevNetworkDemand } from '../../src/commands/dev/dev-network-session';
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
  expect(getDevNetworkDemand({ noTunnel: false })).toEqual({ functions: devNetwork.functions, unreachable: [] });
  expect(getDevNetworkDemand({ noTunnel: true })).toEqual({ functions: { egress: [] }, unreachable: [] });
  // No VPC, NAT or per-function security group of the stack's own: the dev network has them.
  const types = Object.values(template.Resources).map(({ Type }) => Type);
  expect(types.filter((type) => type.startsWith('AWS::EC2::'))).toEqual([]);
  expect(JSON.stringify(template)).not.toContain('"Ref":"StpVpc"');
});
