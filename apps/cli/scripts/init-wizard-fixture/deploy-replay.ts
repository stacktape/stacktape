/**
 * The fixture's deploy: the JSONL stream `stacktape deploy --agent` writes, for the composed configuration.
 *
 * Every phase reports the operations the real CLI reports, with its messages, and CloudFormation reports each AWS
 * resource the template has (from `stack-resources.json`, recorded from real synthesis) in the order and roughly the
 * time AWS takes: the network and roles first, a database last and longest. Times run faster than AWS: `paced` plays a
 * first deploy in about half a minute, `instant` as fast as the page can take it.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Emit = (event: Record<string, unknown>) => void;

export type DeployReplayOptions = {
  /** The configuration's resources, by name. */
  resources: Array<[name: string, type: string]>;
  accountId: string;
  /** Signed out, the deploy reads the machine's AWS profile; signed in, the account connected to Stacktape. */
  accountFree: boolean;
  pace: 'paced' | 'instant';
  /** `held` waits for `release` before the slowest resource finishes; `fail` stops with the app's crash. */
  outcome: 'succeed' | 'fail' | 'held';
  /** The resource whose start fails, for `fail`. */
  failedResource: string;
  failureMessage: { log: string; result: string };
  release: () => Promise<void>;
  emit: Emit;
};

type Catalog = {
  shared: Array<[string, string]>;
  sharedFor: Record<string, Array<[string, string]>>;
  types: Record<string, Array<[string, string]>>;
};

const catalog = JSON.parse(readFileSync(join(import.meta.dir, 'stack-resources.json'), 'utf8')) as Catalog;

/**
 * When CloudFormation can start a resource and roughly how long AWS takes, in seconds. A resource waits for the lower
 * waves of its own part of the app and of the stack's shared resources.
 */
const TIMING: Readonly<Record<string, readonly [wave: number, seconds: number]>> = {
  'AWS::EC2::VPC': [0, 14],
  'AWS::EC2::InternetGateway': [0, 16],
  'AWS::Logs::LogGroup': [0, 2],
  'AWS::IAM::Role': [0, 17],
  'AWS::CloudFront::CachePolicy': [0, 3],
  'AWS::CloudFront::OriginRequestPolicy': [0, 3],
  'AWS::CloudFront::CloudFrontOriginAccessIdentity': [0, 4],
  'AWS::CloudFront::Function': [0, 7],
  'AWS::RDS::DBParameterGroup': [0, 5],
  'AWS::SSM::Document': [0, 3],
  'AWS::ECS::Cluster': [0, 7],
  'AWS::S3::Bucket': [0, 23],
  'AWS::SQS::Queue': [0, 12],
  'AWS::DynamoDB::GlobalTable': [0, 48],
  'AWS::ApiGatewayV2::Api': [0, 4],
  'AWS::EFS::FileSystem': [0, 11],
  'AWS::Events::Rule': [0, 34],
  'AWS::EC2::VPCGatewayAttachment': [1, 17],
  'AWS::EC2::Subnet': [1, 5],
  'AWS::EC2::RouteTable': [1, 3],
  'AWS::EC2::SecurityGroup': [1, 6],
  'AWS::Lambda::Function': [1, 9],
  'AWS::IAM::Policy': [1, 16],
  'AWS::S3::BucketPolicy': [1, 2],
  'AWS::EC2::LaunchTemplate': [1, 4],
  'AWS::ECS::TaskDefinition': [1, 3],
  'AWS::ApiGatewayV2::Stage': [1, 3],
  'AWS::ServiceDiscovery::PrivateDnsNamespace': [1, 48],
  'AWS::EC2::Route': [2, 3],
  'AWS::EC2::SubnetRouteTableAssociation': [2, 2],
  'AWS::RDS::DBSubnetGroup': [2, 3],
  'AWS::Lambda::Url': [2, 2],
  'AWS::Lambda::Permission': [2, 3],
  'AWS::Lambda::EventSourceMapping': [2, 14],
  'AWS::CloudFormation::CustomResource': [2, 9],
  'AWS::EFS::MountTarget': [2, 85],
  'AWS::ApiGatewayV2::VpcLink': [2, 120],
  'AWS::ApiGatewayV2::DomainName': [2, 8],
  'AWS::ServiceDiscovery::Service': [2, 3],
  'AWS::ApiGatewayV2::Integration': [3, 2],
  'AWS::ApiGatewayV2::ApiMapping': [3, 2],
  'AWS::SSM::Association': [3, 5],
  'AWS::EFS::AccessPoint': [3, 4],
  'AWS::RDS::DBInstance': [3, 470],
  'AWS::CloudFront::Distribution': [3, 215],
  'AWS::ECS::Service': [3, 110],
  'AWS::AutoScaling::AutoScalingGroup': [3, 95],
  'AWS::ApiGatewayV2::Route': [4, 2],
  'AWS::ApplicationAutoScaling::ScalableTarget': [4, 5],
  'AWS::CloudWatch::Alarm': [4, 2],
  'AWS::ApplicationAutoScaling::ScalingPolicy': [5, 3]
};

/** Resources that wait for the slow one of their part: an alarm on the database waits for the database. */
const timingOf = (id: string, type: string): readonly [number, number] => {
  if (/DefaultDomainCustomResource$/.test(id)) return [4, 35];
  if (/DeletionProtectionCustomResource$/.test(id)) return [4, 6];
  if (/NotificationRule$/.test(id)) return [5, 30];
  return TIMING[type] ?? [2, 5];
};

/** A stable spread, so resources of one kind do not all finish on the same tick. */
const jitter = (id: string) => {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) % 1000;
  return 0.8 + (hash % 40) / 100;
};

const pascal = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;

type Planned = { id: string; type: string; group: string; start: number; end: number };

/** The template's resources for this configuration, with when each starts and ends, in seconds from the stack's start. */
export const planStack = (resources: Array<[string, string]>): Planned[] => {
  const types = new Set(resources.map(([, type]) => type));
  const entries: Array<{ id: string; type: string; group: string }> = [
    ...catalog.shared.map(([id, type]) => ({ id, type, group: '' })),
    ...[...types].flatMap((type) =>
      (catalog.sharedFor[type] ?? []).map(([id, cfType]) => ({ id, type: cfType, group: '' }))
    ),
    ...resources.flatMap(([name, type]) =>
      (catalog.types[type] ?? []).map(([pattern, cfType]) => ({
        id: pattern.replaceAll('{Name}', pascal(name)).replaceAll('{Port}', '3000'),
        type: cfType,
        group: name
      }))
    )
  ];
  const timed = entries.map((entry) => {
    const [wave, seconds] = timingOf(entry.id, entry.type);
    return { ...entry, wave, seconds: Math.max(1, Math.round(seconds * jitter(entry.id))) };
  });
  const planned = new Map<string, Planned & { wave: number }>();
  for (const entry of timed.toSorted((left, right) => left.wave - right.wave)) {
    const start = Math.max(
      0,
      ...[...planned.values()]
        .filter((other) => other.wave < entry.wave && (other.group === '' || other.group === entry.group))
        .map((other) => other.end)
    );
    planned.set(entry.id, {
      id: entry.id,
      type: entry.type,
      group: entry.group,
      wave: entry.wave,
      start,
      end: start + entry.seconds
    });
  }
  return [...planned.values()].map(({ wave: _wave, ...rest }) => rest);
};

/** What `next build` prints, roughly, for the build log. */
const NEXT_BUILD_OUTPUT = [
  '▲ Next.js 15.3.2',
  'Creating an optimized production build ...',
  '✓ Compiled successfully in 18.4s',
  'Linting and checking validity of types ...',
  'Collecting page data ...',
  '✓ Generating static pages (14/14)',
  'Finalizing page optimization ...',
  'Route (app)                     Size  First Load JS',
  '┌ ○ /                          5.1 kB         118 kB',
  '├ ƒ /api/stripe/webhook          167 B         102 kB',
  '├ ƒ /dashboard                  4.2 kB         131 kB',
  '└ ○ /pricing                    1.9 kB         115 kB'
];

const DOCKER_BUILD_OUTPUT = (name: string) => [
  `$ docker build -t ${name} .`,
  '#1 [internal] load build definition from Dockerfile',
  '#5 [2/6] COPY package.json pnpm-lock.yaml ./',
  '#6 [3/6] RUN pnpm install --frozen-lockfile',
  '#8 [5/6] RUN pnpm run build',
  '#10 exporting to image',
  `#10 naming to docker.io/library/${name}:latest`
];

const VITE_BUILD_OUTPUT = [
  'vite v6.3.5 building for production...',
  '✓ 412 modules transformed.',
  'dist/index.html                   0.46 kB │ gzip:  0.30 kB',
  'dist/assets/index-B1x9fZ2q.css   18.20 kB │ gzip:  4.31 kB',
  'dist/assets/index-Cq2mZ7Xa.js   214.87 kB │ gzip: 68.90 kB',
  '✓ built in 6.81s'
];

export const replayDeploy = async (
  options: DeployReplayOptions
): Promise<{ ok: boolean; code: string; message: string }> => {
  const { emit, resources, accountId } = options;
  const at = () => new Date().toISOString();
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, options.pace === 'instant' ? 0 : ms));
  const event = (
    phase: string,
    eventType: string,
    status: string,
    message: string,
    extra: Record<string, unknown> = {}
  ) => emit({ type: 'event', ts: at(), phase, eventType, status, message, ...extra });
  const log = (level: string, message: string) => emit({ type: 'log', ts: at(), level, source: 'cli', message });
  const output = (eventType: string, instanceId: string, lines: string[]) =>
    emit({
      type: 'output',
      ts: at(),
      stream: 'stdout',
      eventType,
      instanceId,
      parentEventType: 'PACKAGE_ARTIFACTS',
      lines
    });
  /** Seconds as the CLI would spend them before CloudFormation, at a tenth of the time. */
  const pause = (seconds: number) => sleep(seconds * 100);

  // ── Getting ready ──────────────────────────────────────────────────────────────────────────────
  event('INITIALIZE', 'LOAD_AWS_CREDENTIALS', 'started', 'Loading AWS credentials');
  await pause(1.2);
  event(
    'INITIALIZE',
    'LOAD_AWS_CREDENTIALS',
    'completed',
    options.accountFree
      ? 'AWS credentials loaded (profile default)'
      : `AWS credentials loaded via Stacktape for account dev (${accountId})`
  );
  if (!options.accountFree) {
    event('INITIALIZE', 'LOAD_USER_DATA', 'started', 'Loading user data');
    await pause(0.4);
    event('INITIALIZE', 'LOAD_USER_DATA', 'completed', 'Signed in as dev@example.com');
  }
  event('INITIALIZE', 'LOAD_CONFIG_FILE', 'started', 'Loading configuration');
  await pause(0.5);
  event('INITIALIZE', 'LOAD_CONFIG_FILE', 'completed', 'Loading configuration');
  event('INITIALIZE', 'LOAD_METADATA_FROM_AWS', 'started', 'Loading metadata from AWS');
  const metadata = { parentEventType: 'LOAD_METADATA_FROM_AWS' };
  event('INITIALIZE', 'FETCH_STACK_DATA', 'started', 'Fetching stack data', { ...metadata, instanceId: 'Stack data' });
  event('INITIALIZE', 'FETCH_BUDGET_INFO', 'started', 'Fetching budget info', {
    ...metadata,
    instanceId: 'Cost budgets'
  });
  await pause(1.1);
  event('INITIALIZE', 'FETCH_STACK_DATA', 'completed', 'Fetching stack data', {
    ...metadata,
    instanceId: 'Stack data'
  });
  event('INITIALIZE', 'FETCH_BUDGET_INFO', 'completed', 'Fetching budget info', {
    ...metadata,
    instanceId: 'Cost budgets'
  });
  event('INITIALIZE', 'LOAD_METADATA_FROM_AWS', 'completed', 'AWS metadata loaded');

  // ── Building ───────────────────────────────────────────────────────────────────────────────────
  const workloads = resources.filter(([, type]) =>
    ['nextjs-web', 'web-service', 'worker-service', 'hosting-bucket', 'function', 'private-service'].includes(type)
  );
  event('BUILD_AND_PACKAGE', 'PACKAGE_ARTIFACTS', 'started', 'Packaging workloads');
  const artifacts: Array<{ instanceId: string; image: boolean }> = [];
  for (const [name, type] of workloads) {
    const child = (eventType: string, status: string, message: string, instanceId = name) =>
      event('BUILD_AND_PACKAGE', eventType, status, message, { instanceId, parentEventType: 'PACKAGE_ARTIFACTS' });
    if (type === 'nextjs-web') {
      child('BUILD_NEXTJS_PROJECT', 'started', 'Building Nextjs project');
      for (const line of NEXT_BUILD_OUTPUT) {
        await pause(2.6);
        output('BUILD_NEXTJS_PROJECT', name, [line]);
      }
      await pause(3);
      child('BUILD_NEXTJS_PROJECT', 'completed', 'Building Nextjs project');
      child('BUNDLING_NEXTJS_FUNCTIONS', 'started', 'Bundling Nextjs functions');
      const functions: Array<[string, string]> = [
        ['serverFunction', 'Lambda bundle · 9.8 MB (3.1 MB zipped)'],
        ['imageFunction', 'Lambda bundle · 21.4 MB (8.2 MB zipped)'],
        ['revalidationFunction', 'Lambda bundle · 0.4 MB (0.1 MB zipped)'],
        ['revalidationInsertFunction', 'Lambda bundle · 0.3 MB (0.1 MB zipped)']
      ];
      for (const [fn] of functions) child('BUILD_CODE', 'started', 'Identifying shared resources', `${name}.${fn}`);
      for (const [fn, done] of functions) {
        await pause(1.6);
        child('BUILD_CODE', 'completed', done, `${name}.${fn}`);
        artifacts.push({ instanceId: `${name}.${fn}`, image: false });
      }
      child('BUNDLING_NEXTJS_FUNCTIONS', 'completed', 'Bundling Nextjs functions');
    } else if (type === 'hosting-bucket') {
      child('BUILD_HOSTING_BUCKET', 'started', `Building ${name}`);
      for (const line of VITE_BUILD_OUTPUT) {
        await pause(1.2);
        output('BUILD_HOSTING_BUCKET', name, [line]);
      }
      child('BUILD_HOSTING_BUCKET', 'completed', 'Built 38 files · 1.9 MB');
    } else {
      const job = type === 'function' ? name : `${name.toLowerCase()}-service-container`;
      child('BUILD_CODE', 'started', 'Building code', job);
      await pause(1);
      child('BUILD_CODE', 'completed', 'Building code', job);
      child('BUILD_IMAGE', 'started', 'Building docker image', job);
      for (const line of DOCKER_BUILD_OUTPUT(job)) {
        await pause(3.4);
        emit({
          type: 'output',
          ts: at(),
          stream: 'stdout',
          eventType: 'BUILD_IMAGE',
          instanceId: job,
          parentEventType: 'PACKAGE_ARTIFACTS',
          lines: [line]
        });
      }
      child('BUILD_IMAGE', 'completed', 'Container image · 228.08 MB', job);
      artifacts.push({ instanceId: job, image: true });
    }
  }
  event(
    'BUILD_AND_PACKAGE',
    'PACKAGE_ARTIFACTS',
    'completed',
    `Packaged ${workloads.length} workload${workloads.length === 1 ? '' : 's'}`
  );
  const plan = planStack(resources);
  const total = plan.length;
  event('BUILD_AND_PACKAGE', 'RESOLVE_CONFIG', 'started', 'Preparing infrastructure template');
  await pause(0.6);
  event(
    'BUILD_AND_PACKAGE',
    'RESOLVE_CONFIG',
    'completed',
    `Infrastructure template prepared (${total} AWS resources)`
  );
  log('info', `Infrastructure changes: ${total} resources to create (plan 89b138b9e996)`);
  event(
    'BUILD_AND_PACKAGE',
    'CREATE_RESOURCES_FOR_ARTIFACTS',
    'started',
    'Creating AWS resources for deployment artifacts (S3, ECR...)'
  );
  await pause(14);
  event(
    'BUILD_AND_PACKAGE',
    'CREATE_RESOURCES_FOR_ARTIFACTS',
    'completed',
    'Creating AWS resources for deployment artifacts (S3, ECR...)'
  );

  // ── Uploading ──────────────────────────────────────────────────────────────────────────────────
  event('UPLOAD', 'UPLOAD_DEPLOYMENT_ARTIFACTS', 'started', 'Uploading deployment artifacts');
  const upload = { parentEventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS' };
  for (const artifact of artifacts) {
    event(
      'UPLOAD',
      artifact.image ? 'UPLOAD_IMAGE' : 'UPLOAD_PACKAGE',
      'started',
      artifact.image ? 'Uploading image' : 'Uploading artifact',
      { ...upload, instanceId: artifact.instanceId }
    );
  }
  for (const artifact of artifacts) {
    await pause(artifact.image ? 5 : 1.4);
    event(
      'UPLOAD',
      artifact.image ? 'UPLOAD_IMAGE' : 'UPLOAD_PACKAGE',
      'completed',
      artifact.image ? 'Container image uploaded' : 'Artifact uploaded',
      { ...upload, instanceId: artifact.instanceId }
    );
  }
  if (resources.some(([, type]) => type === 'hosting-bucket')) {
    event('UPLOAD', 'SYNC_BUCKET', 'started', 'Syncing directories into buckets');
    await pause(2);
    event('UPLOAD', 'SYNC_BUCKET', 'completed', 'Synced 38 files (1.9 MB)');
  }
  event('UPLOAD', 'UPLOAD_DEPLOYMENT_ARTIFACTS', 'completed', 'Deployment artifacts uploaded');

  // ── CloudFormation ─────────────────────────────────────────────────────────────────────────────
  event('DEPLOY', 'UPDATE_STACK', 'started', 'Deploying infrastructure resources');
  /** Real milliseconds per AWS second: a nine-minute stack in under half a minute. */
  let scale = 50;
  const slowest = plan.reduce((longest, entry) =>
    entry.end - entry.start > longest.end - longest.start ? entry : longest
  );
  // CloudFormation is polled every few seconds: everything that changed in between arrives in one tick.
  const POLL = 3;
  const ticks = [
    ...new Set(plan.flatMap((entry) => [entry.start, entry.end]).map((time) => Math.ceil(time / POLL) * POLL))
  ].toSorted((left, right) => left - right);
  const startedAt = new Map<string, number>();
  const done = new Set<string>();
  let previous = 0;
  const progress = (
    stackAction: string,
    inProgress: Planned[],
    completed: Planned[],
    action: 'CREATE' | 'DELETE',
    count: number
  ) => {
    const percent = Math.round((count / total) * 100);
    const names = inProgress.map((entry) => entry.id);
    const updating =
      names.length === 0
        ? ''
        : ` | updating: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`;
    event(
      'DEPLOY',
      action === 'DELETE' ? 'ROLLBACK_STACK' : 'UPDATE_STACK',
      'running',
      `${count}/${total} resources (${percent}%)${updating} | changes: +${total} ~0 -0`,
      {
        detail: {
          kind: 'cloudformation-progress',
          stackAction,
          completedCount: count,
          totalPlanned: total,
          percent,
          inProgressResources: names,
          inProgressDetails: inProgress.map((entry) => ({
            name: entry.id,
            action,
            resourceType: entry.type,
            since: startedAt.get(entry.id)
          })),
          changeCounts: { created: total, updated: 0, deleted: 0 },
          recentlyCompleted: completed.map((entry) => ({ name: entry.id, action, resourceType: entry.type }))
        }
      }
    );
  };

  for (const time of ticks) {
    const finishing = plan.filter((entry) => !done.has(entry.id) && entry.end <= time);
    if (options.outcome === 'held' && finishing.includes(slowest)) {
      await options.release();
      // Released: the rest plays out quickly.
      scale = 6;
    }
    await sleep((time - previous) * scale);
    previous = time;
    for (const entry of plan) if (entry.start <= time && !startedAt.has(entry.id)) startedAt.set(entry.id, Date.now());
    for (const entry of finishing) done.add(entry.id);
    const inProgress = plan.filter((entry) => startedAt.has(entry.id) && !done.has(entry.id));
    if (options.outcome === 'fail' && done.size / total >= 0.7) {
      log('error', options.failureMessage.log);
      // Automatic rollback: what was created is removed again, newest first.
      const created = plan.filter((entry) => done.has(entry.id)).toReversed();
      let removed = 0;
      for (let index = 0; index < created.length; index += 6) {
        const batch = created.slice(index, index + 6);
        for (const entry of batch) startedAt.set(entry.id, Date.now());
        progress('rollback', batch, [], 'DELETE', removed);
        await sleep(160);
        removed += batch.length;
        progress('rollback', [], batch, 'DELETE', removed);
      }
      event('DEPLOY', 'ROLLBACK_STACK', 'completed', 'Rolled back: no resources were kept');
      return { ok: false, code: 'STACK_ERROR', message: options.failureMessage.result };
    }
    progress('create', inProgress, finishing, 'CREATE', done.size);
  }
  event('DEPLOY', 'UPDATE_STACK', 'completed', 'Deployment successful.');

  // ── Finishing up ───────────────────────────────────────────────────────────────────────────────
  event('POST_DEPLOY', 'REFETCH_STACK_DATA', 'started', 'Fetching stack data');
  await pause(0.6);
  event('POST_DEPLOY', 'REFETCH_STACK_DATA', 'completed', 'Stack data refreshed');
  if (resources.some(([, type]) => type === 'nextjs-web' || type === 'hosting-bucket')) {
    event('POST_DEPLOY', 'INVALIDATE_CACHE', 'started', 'Invalidating CDN caches');
    await pause(1.2);
    event(
      'POST_DEPLOY',
      'INVALIDATE_CACHE',
      'completed',
      'Invalidation has started but it might take few seconds until all edge locations are invalidated.'
    );
  }
  emit({ type: 'result', ts: at(), ok: true, code: 'OK', message: 'deploy completed' });
  return { ok: true, code: 'OK', message: 'deploy completed' };
};
