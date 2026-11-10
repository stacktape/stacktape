/**
 * Synthesizes the stages whose templates the isometric diagram's security-group model is tested against, and writes
 * each template with the Stacktape resource that owns every logical ID, as the Console reads them for a deployed stage.
 *
 *   bun apps/cli/tests/synthesis-families/security-group-fixtures.ts           write the fixtures
 *   bun apps/cli/tests/synthesis-families/security-group-fixtures.ts --check   fail when they are out of date
 *
 * The fixtures live in `packages/ui-react`, whose tests read them as plain JSON. The generator lives here because a
 * package must not import the CLI. `security-group-fixtures.spec.ts` runs the check with the synthesis-family tests,
 * so a resolver change that alters security groups fails until the fixtures are regenerated and the diagram's
 * expectations reviewed.
 */
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { SharedNetwork } from '@domain-services/vpc-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { ec2Manager } from '@domain-services/ec2-manager';
import type { StackInfoMapResource } from '@domain-services/stack-info/types';
import type { NormalizedStackInfoMapResource } from '@stacktape/stack-info/contracts';
import { getUserResourcesFromStackInfoMap } from '@stacktape/stack-info/selectors';
import { synthesizeFixture } from '../characterization/synthesis-fixture';

export const SECURITY_GROUP_FIXTURE_DIRECTORY = resolve(
  import.meta.dir,
  '../../../../packages/ui-react/src/isometric-diagram/generated/security-group-templates'
);

type Scenario = {
  name: string;
  description: string;
  config: string;
  sharedNetwork?: { network: SharedNetwork; usesNat: boolean };
};

const image = `
      packaging:
        type: prebuilt-image
        properties:
          image: example.invalid/app:v1
      resources:
        cpu: 0.25
        memory: 512`;

const handler = (extra = '') => `
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: handler.ts${extra}`;

const postgres = (accessibility: string) => `
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
      accessibility:${accessibility}`;

const valkey = (accessibility = '') => `
    type: redis
    properties:
      engine:
        type: valkey
        properties:
          instanceSize: cache.t4g.micro
      defaultUserPassword: synthetic-redis-password${accessibility}`;

const sharedNetwork: SharedNetwork = {
  vpcId: 'vpc-0shared',
  vpcCidr: '10.231.0.0/16',
  publicSubnets: ['a', 'b', 'c'].map((zone) => ({ id: `subnet-public-${zone}`, availabilityZone: `eu-west-1${zone}` })),
  privateSubnets: ['a', 'b', 'c'].map((zone) => ({
    id: `subnet-private-${zone}`,
    availabilityZone: `eu-west-1${zone}`
  })),
  natPublicIp: '203.0.113.7',
  noAccessSecurityGroupId: 'sg-0noaccess'
};

export const SECURITY_GROUP_SCENARIOS: Scenario[] = [
  {
    name: 'database-accessibility',
    description:
      'A web service and a VPC function next to one Postgres database per accessibility mode; only the service connects to the scoped one.',
    config: `resources:
  web:
    type: web-service
    properties:${image}
      connectTo: [scopedDb]
  reports:${handler('\n      joinDefaultVpc: true')}
  publicDb:${postgres(`
        accessibilityMode: internet`)}
  vpcDb:${postgres(`
        accessibilityMode: vpc`)}
  scopedDb:${postgres(`
        accessibilityMode: scoping-workloads-in-vpc
        whitelistedIps: [203.0.113.10]`)}
`
  },
  {
    name: 'private-network',
    description:
      'A private service behind an internal load balancer, a worker in private subnets with a NAT gateway, scoped Redis and EFS mounted by the worker.',
    config: `stackConfig:
  nat: gateway
resources:
  internalApi:
    type: private-service
    properties:${image}
      port: 3000
      loadBalancing:
        type: application-load-balancer
  worker:
    type: worker-service
    properties:${image}
      usePrivateSubnetsWithNAT: true
      connectTo: [cache]
      volumeMounts:
        - type: efs
          properties:
            efsFilesystemName: files
            mountPath: /data
  cache:${valkey(`
      accessibility:
        accessibilityMode: scoping-workloads-in-vpc`)}
  files:
    type: efs-filesystem
`
  },
  {
    name: 'lambda-vpc',
    description:
      'VPC functions that share groups by connection, an OpenSearch domain reachable from the VPC and Redis scoped to one function.',
    config: `resources:
  search:${handler('\n      joinDefaultVpc: true\n      connectTo: [searchDomain, cache]')}
  indexer:${handler('\n      joinDefaultVpc: true\n      connectTo: [searchDomain, cache]')}
  plain:${handler('\n      joinDefaultVpc: true')}
  searchDomain:
    type: open-search-domain
    properties:
      clusterConfig:
        instanceType: t3.small.search
        instanceCount: 1
      storage:
        size: 10
      accessibility:
        accessibilityMode: vpc
  cache:${valkey(`
      accessibility:
        accessibilityMode: scoping-workloads-in-vpc`)}
`
  },
  {
    name: 'http-api-vpc-link',
    description:
      'An HTTP API that reaches containers through a VPC link, next to a blue/green web service behind an application load balancer and one behind a network load balancer.',
    config: `resources:
  api:
    type: http-api-gateway
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: server
          packaging:
            type: prebuilt-image
            properties:
              image: example.invalid/app:v1
          events:
            - type: http-api-gateway
              properties:
                httpApiGatewayName: api
                containerPort: 8080
                method: '*'
                path: /{proxy+}
      resources:
        cpu: 0.25
        memory: 512
  albWeb:
    type: web-service
    properties:${image}
      loadBalancing:
        type: application-load-balancer
      deployment:
        strategy: Canary10Percent5Minutes
  tcpWeb:
    type: web-service
    properties:${image}
      loadBalancing:
        type: network-load-balancer
        properties:
          ports:
            - port: 5000
              protocol: TCP
`
  },
  {
    name: 'convex',
    description:
      'A Convex resource with its defaults: a load balancer in front of the backend and the dashboard, which run as two services, and its Postgres database.',
    config: `resources:
  app:
    type: convex
    properties:
      appDirectory: ./convex
`
  },
  {
    name: 'alb-whitelisted-listeners',
    description:
      'An application load balancer whose two listeners each admit one address: port 80 from 203.0.113.10/32 and port 8080 from 198.51.100.20/32.',
    config: `resources:
  edge:
    type: application-load-balancer
    properties:
      listeners:
        - protocol: HTTP
          port: 80
          whitelistIps: [203.0.113.10/32]
        - protocol: HTTP
          port: 8080
          whitelistIps: [198.51.100.20/32]
  handler:${handler(`
      events:
        - type: application-load-balancer
          properties:
            loadBalancerName: edge
            listenerPort: 80
            priority: 1
            paths: ['/*']`)}
`
  },
  {
    name: 'batch-bastion-nat-instance',
    description:
      'A batch job and an AgentCore runtime that connect to a scoped database, a bastion, and NAT instances for a private worker.',
    config: `stackConfig:
  nat: ec2
resources:
  importer:
    type: batch-job
    properties:
      container:
        packaging:
          type: prebuilt-image
          properties:
            image: example.invalid/importer:v1
      resources:
        cpu: 1
        memory: 2048
      connectTo: [db]
  jumpHost:
    type: bastion
  agent:
    type: agentcore-runtime
    properties:
      packaging:
        type: prebuilt-image
        properties:
          image: example.invalid/agent:v1
      connectTo: [db]
  privateWorker:
    type: worker-service
    properties:${image}
      usePrivateSubnetsWithNAT: true
  db:${postgres(`
        accessibilityMode: scoping-workloads-in-vpc`)}
`
  },
  {
    name: 'ec2-workload-kafka',
    description:
      'A web service on EC2 instances behind a load balancer, and functions that connect to a Kafka cluster or consume its topic.',
    config: `resources:
  ec2Web:
    type: web-service
    properties:
      packaging:
        type: prebuilt-image
        properties:
          image: example.invalid/app:v1
      resources:
        instanceTypes: [t3.micro]
      loadBalancing:
        type: application-load-balancer
  events:
    type: kafka-cluster
  producer:${handler('\n      joinDefaultVpc: true\n      connectTo: [events]')}
  consumer:${handler(`
      joinDefaultVpc: true
      events:
        - type: kafka-topic
          properties:
            kafkaClusterName: events
            topicName: orders
            startFrom: latest`)}
`
  },
  {
    name: 'shared-network-stage',
    description:
      "A stage in the shared non-production network, where the stage's group stands in for the VPC's CIDR: an internal load balancer admits it.",
    sharedNetwork: { usesNat: true, network: sharedNetwork },
    config: `stackConfig:
  nat: ec2
resources:
  orders:${postgres(`
        accessibilityMode: scoping-workloads-in-vpc`)}
  api:${handler('\n      joinDefaultVpc: true\n      connectTo: [orders]')}
  cron:${handler('\n      joinDefaultVpc: true')}
  internalLb:
    type: application-load-balancer
    properties:
      interface: internal
`
  },
  {
    name: 'shared-network-no-access',
    description:
      "A shared-network stage where nothing admits the stage's group, so a function that reaches nothing runs in the network's no-access group.",
    sharedNetwork: { usesNat: true, network: sharedNetwork },
    config: `stackConfig:
  nat: ec2
resources:
  orders:${postgres(`
        accessibilityMode: scoping-workloads-in-vpc`)}
  api:${handler('\n      joinDefaultVpc: true\n      connectTo: [orders]')}
  cron:${handler('\n      joinDefaultVpc: true')}
`
  }
];

export type SecurityGroupFixture = {
  description: string;
  config: string;
  stacktapeResources: { name: string; type: string; logicalIds: string[] }[];
  resources: Record<string, unknown>;
};

/** Synthesis reads instance memory and architecture from EC2, which the credential-free fixture forbids. */
const withT3MicroInstanceType = async <Result>(operation: () => Promise<Result>) => {
  const { init } = ec2Manager;
  ec2Manager.init = async () => {
    ec2Manager.ec2InstanceTypes = [
      {
        InstanceType: 't3.micro',
        ProcessorInfo: { SupportedArchitectures: ['x86_64'] },
        VCpuInfo: { DefaultVCpus: 2 },
        MemoryInfo: { SizeInMiB: 1024 }
      }
    ] as typeof ec2Manager.ec2InstanceTypes;
  };
  try {
    return await operation();
  } finally {
    ec2Manager.init = init;
  }
};

/**
 * The parts of a resource in the CLI's stack-info map that the Console's resource selector reads. The CLI's map still
 * holds unresolved values, which the deployed map has resolved.
 */
const toConsoleResource = (resource: StackInfoMapResource): NormalizedStackInfoMapResource => ({
  resourceType: resource.resourceType,
  cloudformationChildResources: resource.cloudformationChildResources,
  referenceableParams: {},
  links: {},
  outputs: {},
  ...(resource._nestedResources && {
    _nestedResources: Object.fromEntries(
      Object.entries(resource._nestedResources).map(([name, nested]) => [name, toConsoleResource(nested)])
    )
  })
});

const synthesizeScenario = async (scenario: Scenario, directory: string): Promise<SecurityGroupFixture> => {
  const configPath = join(directory, `${scenario.name}.yml`);
  await writeFile(configPath, scenario.config);
  const template = await withT3MicroInstanceType(() =>
    synthesizeFixture({
      configPath,
      workingDir: directory,
      identity: { projectName: 'security', stage: 'fixture' },
      sharedNetwork: scenario.sharedNetwork
    })
  );
  const stackInfoMap = {
    metadata: {},
    customOutputs: {},
    resources: Object.fromEntries(
      Object.entries(calculatedStackOverviewManager.stackInfoMap.resources).map(([name, resource]) => [
        name,
        toConsoleResource(resource)
      ])
    )
  };
  return {
    description: scenario.description,
    config: scenario.config,
    // What the Console passes: every user resource with the logical IDs `getUserResourcesFromStackInfoMap` gives it.
    stacktapeResources: getUserResourcesFromStackInfoMap(stackInfoMap).map((resource) => ({
      name: resource.name,
      type: resource.resourceType,
      logicalIds: Object.keys(resource.cloudformationChildResources).sort()
    })),
    resources: Object.fromEntries(
      Object.entries(template.Resources).map(([logicalId, resource]) => [
        logicalId,
        // IAM resources say nothing about network reachability and are most of a template's bytes.
        resource.Type.startsWith('AWS::IAM::') ? { Type: resource.Type } : resource
      ])
    )
  };
};

const serialize = (fixture: SecurityGroupFixture) => `${JSON.stringify(fixture, null, 2)}\n`;

/** Each scenario's fixture file name and contents, synthesized offline. */
export const synthesizeSecurityGroupFixtures = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-security-group-fixtures-'));
  try {
    await writeFile(join(directory, 'handler.ts'), 'export default async () => ({ statusCode: 200 });\n');
    // The Convex scenario's app directory, which synthesis checks exists.
    await mkdir(join(directory, 'convex'));
    await writeFile(join(directory, 'convex', 'schema.ts'), 'export default {};\n');
    const files = new Map<string, string>();
    for (const scenario of SECURITY_GROUP_SCENARIOS) {
      // Synthesis shares process-wide managers, so the scenarios run one after another.
      files.set(`${scenario.name}.json`, serialize(await synthesizeScenario(scenario, directory)));
    }
    return files;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

const committedFixtureFiles = async () =>
  (await readdir(SECURITY_GROUP_FIXTURE_DIRECTORY).catch(() => [] as string[])).filter((file) =>
    file.endsWith('.json')
  );

/** The fixture files that are missing, outdated or no longer produced by any scenario. */
export const findStaleSecurityGroupFixtures = async (expected: Map<string, string>) => {
  const stale = (await committedFixtureFiles()).filter((file) => !expected.has(file));
  for (const [file, contents] of expected) {
    const current = await readFile(join(SECURITY_GROUP_FIXTURE_DIRECTORY, file), 'utf8').catch(() => undefined);
    if (current !== contents) stale.push(file);
  }
  return stale.sort();
};

const main = async () => {
  const expected = await synthesizeSecurityGroupFixtures();
  if (process.argv.includes('--check')) {
    const stale = await findStaleSecurityGroupFixtures(expected);
    if (stale.length) {
      console.error(
        `Out of date: ${stale.join(', ')}. Run: bun apps/cli/tests/synthesis-families/security-group-fixtures.ts`
      );
      process.exitCode = 1;
      return;
    }
    console.info('Security-group fixtures are up to date.');
  } else {
    await mkdir(SECURITY_GROUP_FIXTURE_DIRECTORY, { recursive: true });
    for (const file of await committedFixtureFiles()) {
      if (!expected.has(file)) await rm(join(SECURITY_GROUP_FIXTURE_DIRECTORY, file));
    }
    for (const [file, contents] of expected) {
      await writeFile(join(SECURITY_GROUP_FIXTURE_DIRECTORY, file), contents);
    }
    console.info(`Wrote ${expected.size} security-group fixtures to ${SECURITY_GROUP_FIXTURE_DIRECTORY}.`);
  }
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
