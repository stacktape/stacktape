/**
 * Real-AWS check that a hosting bucket serves a redeploy's content through CloudFront as soon as the deploy returns,
 * although CloudFront had the previous page cached. MiniStack has no CloudFront, so only a real distribution shows
 * whether the deploy invalidates the cache and waits for it.
 *
 * It deploys `_test-stacks/static-site` through the source-built CLI, after writing the fixture's `site/index.html`:
 * 1. requests the page until CloudFront serves the first value, then again until a response comes from the cache;
 * 2. writes a new value and deploys again; the first request after the deploy returns must see the new value;
 * 3. deletes the stack with the CLI, then confirms with AWS that the stack, the distribution, the buckets, functions,
 *    roles and log groups are gone.
 *
 * The guardrails are those of `source-cli-canary.ts` and docs/testing/live-aws.md.
 *
 *   STP_AWS_STATIC_CANARY_DEPLOY=1 STP_AWS_STATIC_CANARY_EXPECTED_ACCOUNT_ID=<12 digits>
 *   STP_AWS_STATIC_CANARY_PROFILE=<name> STP_AWS_STATIC_CANARY_OWNER=<run id>
 *   STP_AWS_STATIC_CANARY_STATE_FILE=<absolute path> [STP_AWS_STATIC_CANARY_REPORT=<absolute path>]
 *   [STP_AWS_STATIC_CANARY_PROJECT_NAME=v4staticcanary-…] [STP_AWS_STATIC_CANARY_REGION=eu-west-1]
 *   pnpm --filter @stacktape/cli run test:real-aws-static-site-canary [-- --cleanup-only]
 */
import {
  CloudFormationClient,
  DeleteStackCommand,
  GetTemplateCommand,
  waitUntilStackDeleteComplete,
  type StackResource
} from '@aws-sdk/client-cloudformation';
import { CloudFrontClient, GetDistributionCommand } from '@aws-sdk/client-cloudfront';
import { CloudWatchLogsClient, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';
import {
  DeleteRoleCommand,
  DeleteRolePolicyCommand,
  GetRoleCommand,
  IAMClient,
  ListRolePoliciesCommand
} from '@aws-sdk/client-iam';
import { DeleteFunctionCommand, GetFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { fromIni } from '@aws-sdk/credential-providers';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { REGIONS_WITH_REGIONAL_CDN_EDGE_LOCATION } from '../../src/config/constants';
import { parseYaml } from '../../src/utils/yaml';
import {
  assert,
  assertOwned,
  awaitDomainsReleased,
  type BaseState,
  type CanaryOptions,
  CLI_DIRECTORY,
  cleanupCommand,
  createSourceCliRunner,
  deleteLogGroups,
  describeStack,
  emptyBucket,
  gone,
  hasDevApiKey,
  isMissing,
  readStackResources,
  readState,
  resolveCanaryOptions,
  sleep,
  writeState
} from './source-cli-canary';

/** A Lambda@Edge function, created in us-east-1 by a custom resource and not by CloudFormation itself. */
type EdgeFunction = { functionName: string; roleName: string; logGroupName: string };
type Owned = {
  deploymentBucket?: string;
  edgeFunctions?: EdgeFunction[];
  /** Edge function resources the stack deletion left and the canary removed: a product defect, not a cleanup gap. */
  edgeLeftByStack?: string[];
  domains?: string[];
  buckets?: string[];
  distributionIds?: string[];
  functionNames?: string[];
  roleNames?: string[];
  logGroupNames?: string[];
};
type State = BaseState & Owned;
type Clients = {
  cloudFormation: CloudFormationClient;
  cloudFront: CloudFrontClient;
  iam: IAMClient;
  lambda: LambdaClient;
  edgeLambda: LambdaClient;
  logs: CloudWatchLogsClient;
  edgeLogs: CloudWatchLogsClient[];
  s3: S3Client;
  sts: STSClient;
};
type Runner = ReturnType<typeof createSourceCliRunner>;

const PREFIX = 'STP_AWS_STATIC_CANARY_';
const SCRIPT = 'test:real-aws-static-site-canary';
const STAGE = 'canary';
const CONFIG_PATH = '_test-stacks/static-site/stacktape.ts';
const SITE_DIRECTORY = join(CLI_DIRECTORY, '_test-stacks', 'static-site', 'site');
/** CloudFormation returns once the distribution is deployed, but edge locations may take a little longer. */
const SERVING_TIMEOUT_MS = 5 * 60 * 1000;

export const resolveOptions = (env = process.env) =>
  resolveCanaryOptions(env, { prefix: PREFIX, projectPrefix: 'v4staticcanary-' });

const createClients = ({ profile, region }: CanaryOptions): Clients => {
  const config = { credentials: fromIni({ profile }), region, maxAttempts: 6, ignoreConfiguredEndpointUrls: true };
  return {
    cloudFormation: new CloudFormationClient(config),
    cloudFront: new CloudFrontClient(config),
    iam: new IAMClient(config),
    lambda: new LambdaClient(config),
    edgeLambda: new LambdaClient({ ...config, region: 'us-east-1' }),
    logs: new CloudWatchLogsClient(config),
    // Each edge function gets a log group in every region with a regional edge cache.
    edgeLogs: REGIONS_WITH_REGIONAL_CDN_EDGE_LOCATION.map(
      (edgeRegion) => new CloudWatchLogsClient({ ...config, region: edgeRegion })
    ),
    s3: new S3Client(config),
    sts: new STSClient(config)
  };
};

const describeOwned = (resources: StackResource[]): Owned => {
  const physical = (type: string) =>
    resources
      .filter(({ ResourceType }) => ResourceType === type)
      .flatMap(({ PhysicalResourceId }) => PhysicalResourceId ?? []);
  return {
    deploymentBucket: resources.find(({ LogicalResourceId }) => LogicalResourceId === cfLogicalNames.deploymentBucket())
      ?.PhysicalResourceId,
    buckets: physical('AWS::S3::Bucket'),
    distributionIds: physical('AWS::CloudFront::Distribution'),
    // A custom resource creates the default domain in Stacktape's zone; its physical id is the domain name.
    domains: resources
      .filter(({ LogicalResourceId }) => LogicalResourceId?.endsWith('DefaultDomainCustomResource'))
      .flatMap(({ PhysicalResourceId }) => (PhysicalResourceId?.includes('.') ? [PhysicalResourceId] : [])),
    functionNames: physical('AWS::Lambda::Function'),
    roleNames: physical('AWS::IAM::Role'),
    logGroupNames: physical('AWS::Logs::LogGroup')
  };
};

/** The edge functions the deployed template asks its custom resources for, with the role and log group of each. */
const readEdgeFunctions = async (clients: Clients, stackName: string): Promise<EdgeFunction[]> => {
  const body = (await clients.cloudFormation.send(new GetTemplateCommand({ StackName: stackName }))).TemplateBody;
  const template = parseYaml(body ?? '{}') as { Resources?: Record<string, { Properties?: Record<string, unknown> }> };
  return Object.values(template.Resources ?? {}).flatMap(({ Properties }) => {
    const edge = Properties?.edgeLambda as Record<string, unknown> | undefined;
    return typeof edge?.resourceName === 'string' &&
      typeof edge.lambdaRoleResourceName === 'string' &&
      typeof edge.lambdaLogGroupName === 'string'
      ? [
          {
            functionName: edge.resourceName,
            roleName: edge.lambdaRoleResourceName,
            logGroupName: edge.lambdaLogGroupName
          }
        ]
      : [];
  });
};

/**
 * Checks what the stack deletion left of its edge functions, then deletes those exact leftovers. AWS refuses to
 * delete a function until CloudFront has removed its replicas, which can take hours; such a function is returned as
 * pending, and a later `--cleanup-only` run deletes it.
 */
const cleanupEdgeFunctions = async (clients: Clients, edgeFunctions: EdgeFunction[]) => {
  const leftByStack: string[] = [];
  const pendingFunctions: string[] = [];
  for (const { functionName, roleName, logGroupName } of edgeFunctions) {
    for (const logs of clients.edgeLogs) {
      const region = await logs.config.region();
      const found = await logs.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: logGroupName }));
      if (found.logGroups?.some((group) => group.logGroupName === logGroupName)) {
        leftByStack.push(`log group ${logGroupName} (${region})`);
        await deleteLogGroups(logs, [logGroupName]);
      }
    }
    const roleGone = await gone(
      () => clients.iam.send(new GetRoleCommand({ RoleName: roleName })),
      ['NoSuchEntityException', 'NoSuchEntity']
    );
    if (!roleGone) {
      leftByStack.push(`role ${roleName}`);
      const policies = await clients.iam.send(new ListRolePoliciesCommand({ RoleName: roleName }));
      for (const PolicyName of policies.PolicyNames ?? []) {
        await clients.iam.send(new DeleteRolePolicyCommand({ RoleName: roleName, PolicyName }));
      }
      await clients.iam.send(new DeleteRoleCommand({ RoleName: roleName }));
    }
    const describe = () => clients.edgeLambda.send(new GetFunctionCommand({ FunctionName: functionName }));
    if (await gone(describe, ['ResourceNotFoundException'])) continue;
    try {
      await clients.edgeLambda.send(new DeleteFunctionCommand({ FunctionName: functionName }));
    } catch (error) {
      if (!(error instanceof Error && /replicated function/i.test(error.message))) throw error;
      pendingFunctions.push(functionName);
    }
  }
  return { leftByStack, pendingFunctions };
};

const mergeOwned = (state: State, owned: Owned) => {
  const merge = (left: string[] = [], right: string[] = []) => [...new Set([...left, ...right])];
  state.deploymentBucket ??= owned.deploymentBucket;
  for (const key of ['buckets', 'distributionIds', 'domains', 'functionNames', 'roleNames', 'logGroupNames'] as const) {
    state[key] = merge(state[key], owned[key]);
  }
};

const writeSite = async (value: string) => {
  await mkdir(SITE_DIRECTORY, { recursive: true });
  await writeFile(
    join(SITE_DIRECTORY, 'index.html'),
    `<!doctype html><title>canary</title><p id="value">${value}</p>\n`
  );
};

const requestPage = async (url: string) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  const text = await response.text();
  return {
    status: response.status,
    value: text.match(/<p id="value">([^<]*)<\/p>/)?.[1] ?? null,
    cache: response.headers.get('x-cache'),
    cacheControl: response.headers.get('cache-control')
  };
};

/** Requests the page until it serves `expected`, then until CloudFront answers it from the cache. */
const awaitCachedValue = async (url: string, expected: string) => {
  const startedAt = Date.now();
  let last: unknown;
  let served: number | undefined;
  while (Date.now() - startedAt < SERVING_TIMEOUT_MS) {
    const page = await requestPage(url).catch((error: unknown) => ({ status: 0, value: String(error), cache: null }));
    last = page;
    if (page.status === 200 && page.value === expected) {
      served ??= Math.round((Date.now() - startedAt) / 1000);
      if (page.cache?.startsWith('Hit')) return { secondsToServe: served, cachedResponse: page };
    }
    await sleep(2000);
  }
  throw new Error(`CloudFront never served ${expected} from its cache; the last response was ${JSON.stringify(last)}.`);
};

const cleanup = async (clients: Clients, options: CanaryOptions, runner: Runner, stackName: string) => {
  const state = await readState<State>(options, stackName);
  const stack = await describeStack(clients.cloudFormation, stackName);
  const verification: Record<string, unknown> = {};
  if (stack) {
    assertOwned(stack, options.owner, state.stackId);
    mergeOwned(state, describeOwned(await readStackResources(clients.cloudFormation, stackName)));
    state.edgeFunctions ??= await readEdgeFunctions(clients, stackName);
    await writeState(options, state);
    try {
      // The CLI loads the config, whose upload directory must exist, also in a resumed cleanup.
      await writeSite('deleting');
      const deletion = await runner.runStackCommand('delete', {
        configPath: CONFIG_PATH,
        stage: STAGE,
        awsAccountName: state.awsAccountName,
        invocationId: `static-canary-delete-${Date.now()}`
      });
      verification.deletedBy = 'stacktape delete';
      verification.deleteDurationMs = deletion.durationMs;
    } catch (cliError) {
      console.warn(`Stacktape delete failed; deleting the owned stack directly. ${String(cliError).slice(0, 600)}`);
      verification.cliDeleteError = String(cliError).slice(0, 600);
      // CloudFormation cannot delete a non-empty bucket; these exact ones belong to the stack.
      for (const bucket of [state.deploymentBucket, ...(state.buckets ?? [])].filter(Boolean) as string[]) {
        await emptyBucket(clients.s3, bucket).catch((error: unknown) => {
          if (!isMissing(error, ['NoSuchBucket', 'NotFound'])) throw error;
        });
      }
      await clients.cloudFormation.send(new DeleteStackCommand({ StackName: stack.StackId }));
      verification.deletedBy = 'CloudFormation DeleteStack after a failed stacktape delete';
    }
    const waited = await waitUntilStackDeleteComplete(
      { client: clients.cloudFormation, maxWaitTime: 40 * 60, minDelay: 10, maxDelay: 30 },
      { StackName: stack.StackId }
    );
    assert(waited.state === 'SUCCESS', `CloudFormation did not confirm deletion of ${stackName}: ${waited.state}.`);
  }
  assert(!(await describeStack(clients.cloudFormation, stackName)), `${stackName} still exists.`);
  verification.stack = 'absent';

  const checks: [string, string[], (name: string) => Promise<unknown>, string[]][] = [
    [
      'bucket',
      [state.deploymentBucket, ...(state.buckets ?? [])].filter(Boolean) as string[],
      (name) => clients.s3.send(new HeadBucketCommand({ Bucket: name })),
      ['NotFound', 'NoSuchBucket']
    ],
    [
      'distribution',
      state.distributionIds ?? [],
      (id) => clients.cloudFront.send(new GetDistributionCommand({ Id: id })),
      ['NoSuchDistribution']
    ],
    [
      'function',
      state.functionNames ?? [],
      (name) => clients.lambda.send(new GetFunctionCommand({ FunctionName: name })),
      ['ResourceNotFoundException']
    ],
    [
      'role',
      state.roleNames ?? [],
      (name) => clients.iam.send(new GetRoleCommand({ RoleName: name })),
      ['NoSuchEntityException', 'NoSuchEntity']
    ]
  ];
  const leftovers: string[] = [];
  const absent: Record<string, number> = {};
  for (const [kind, names, describe, missingErrors] of checks) {
    for (const name of new Set(names)) {
      if (!(await gone(() => describe(name), missingErrors))) leftovers.push(`${kind} ${name}`);
    }
    absent[kind] = new Set(names).size;
  }
  assert(leftovers.length === 0, `Stack deletion left owned resources: ${leftovers.join(', ')}.`);
  verification.stackResourcesAbsent = absent;
  verification.logGroups = await deleteLogGroups(clients.logs, [
    ...(state.logGroupNames ?? []),
    ...(state.functionNames ?? []).map((name) => `/aws/lambda/${name}`)
  ]);
  verification.domains = await awaitDomainsReleased(state.domains ?? []);
  const edge = await cleanupEdgeFunctions(clients, state.edgeFunctions ?? []);
  state.edgeLeftByStack = [...new Set([...(state.edgeLeftByStack ?? []), ...edge.leftByStack])];
  await writeState(options, state);
  verification.edgeFunctions = { count: state.edgeFunctions?.length ?? 0, ...edge };
  assert(
    edge.pendingFunctions.length === 0,
    `CloudFront has not released the replicas of ${edge.pendingFunctions.join(', ')} yet; AWS allows deleting them ` +
      `only afterwards, usually within a few hours. Run this later:\n${cleanupCommand(options, PREFIX, SCRIPT)}`
  );
  await writeState(options, { ...state, cleanupVerifiedAt: new Date().toISOString() });
  return verification;
};

export const runStaticSiteCanary = async ({ cleanupOnly = false }: { cleanupOnly?: boolean } = {}) => {
  const options = resolveOptions();
  const clients = createClients(options);
  const runner = createSourceCliRunner(options, `${PREFIX}OWNER`);
  const stackName = `${options.projectName}-${STAGE}`;
  const report: Record<string, unknown> = {
    kind: 'stacktape-static-site-canary',
    startedAt: new Date().toISOString(),
    region: options.region,
    projectName: options.projectName,
    stage: STAGE,
    stackName,
    owner: options.owner
  };
  const writeReport = () =>
    options.reportFile ? writeFile(options.reportFile, `${JSON.stringify(report, null, 2)}\n`) : Promise.resolve();
  let deployAttempted = false;
  let bodyError: unknown;
  let cleanupError: unknown;

  try {
    const identity = await clients.sts.send(new GetCallerIdentityCommand({}));
    assert(
      identity.Account === options.expectedAccountId,
      `AWS credentials resolved to account ${identity.Account}, not the expected ${options.expectedAccountId}.`
    );
    report.accountId = identity.Account;
    if (cleanupOnly) {
      report.cleanup = await cleanup(clients, options, runner, stackName);
      return;
    }
    assert(await hasDevApiKey(), 'apps/cli/.env.local sets no STACKTAPE_API_KEY.');
    const run = options.owner.replace(/[^\w-]/g, '-');
    const awsAccountName = await runner.resolveAwsAccountName(`static-canary-whoami-${run}`);
    report.awsAccountName = awsAccountName;
    assert(
      !(await describeStack(clients.cloudFormation, stackName)),
      `Refusing to mutate existing stack ${stackName}.`
    );
    const state: State = {
      accountId: options.expectedAccountId,
      region: options.region,
      projectName: options.projectName,
      stage: STAGE,
      stackName,
      owner: options.owner,
      awsAccountName
    };
    await writeState(options, state);
    const values = { initial: `initial-${run}`, updated: `updated-${run}` };
    const deploy = async (value: string, invocationId: string) => {
      await writeSite(value);
      return runner.runStackCommand('deploy', { configPath: CONFIG_PATH, stage: STAGE, awsAccountName, invocationId });
    };

    // A rejected preflight above authorizes no cleanup; from here on, cleanup always runs.
    deployAttempted = true;
    const first = await deploy(values.initial, `static-canary-1-${run}`);
    const stack = await describeStack(clients.cloudFormation, stackName);
    assert(stack, `${stackName} does not exist after the first deploy.`);
    assertOwned(stack, options.owner);
    state.stackId = stack.StackId;
    const resources = await readStackResources(clients.cloudFormation, stackName);
    mergeOwned(state, describeOwned(resources));
    state.edgeFunctions = await readEdgeFunctions(clients, stackName);
    await writeState(options, state);
    report.edgeFunctions = state.edgeFunctions.map(({ functionName }) => functionName);
    report.resources = resources.map(({ LogicalResourceId, ResourceType }) => `${LogicalResourceId} ${ResourceType}`);
    assert(
      state.distributionIds?.length === 1,
      `Expected one distribution in the stack, found ${state.distributionIds?.length ?? 0}.`
    );
    const distribution = await clients.cloudFront.send(new GetDistributionCommand({ Id: state.distributionIds[0] }));
    const url = `https://${distribution.Distribution?.DomainName}/`;
    report.initial = { deployDurationMs: first.durationMs, ...(await awaitCachedValue(url, values.initial)) };
    await writeReport();

    const second = await deploy(values.updated, `static-canary-2-${run}`);
    const firstAfterUpdate = await requestPage(url);
    report.update = {
      deployDurationMs: second.durationMs,
      firstResponse: firstAfterUpdate,
      ...(await awaitCachedValue(url, values.updated))
    };
    await writeReport();
    assert(
      firstAfterUpdate.value === values.updated,
      `The first request after the redeploy returned ${String(firstAfterUpdate.value)}, not the new content.`
    );
  } catch (error) {
    bodyError = error;
  } finally {
    if (!cleanupOnly && deployAttempted) {
      try {
        report.cleanup = await cleanup(clients, options, runner, stackName);
      } catch (error) {
        cleanupError = error;
        report.cleanup = { failed: String(error), recoveryCommand: cleanupCommand(options, PREFIX, SCRIPT) };
      }
    }
    await runner.dispose();
    await rm(SITE_DIRECTORY, { recursive: true, force: true });
    report.finishedAt = new Date().toISOString();
    report.result = bodyError || cleanupError ? 'failed' : 'passed';
    if (bodyError) report.error = String(bodyError);
    await writeReport();
    for (const client of Object.values(clients).flat()) client.destroy();
  }

  // The canary removed them, but the stack deletion should have; this fails the run even while a cleanup is pending.
  const leftByStack =
    deployAttempted || cleanupOnly ? (await readState<State>(options, stackName)).edgeLeftByStack : [];
  const leftError = leftByStack?.length
    ? new Error(`The stack deletion left edge function resources: ${leftByStack.join(', ')}.`)
    : undefined;
  if (leftError) {
    Object.assign(report, { edgeLeftByStack: leftByStack, result: 'failed' });
    await writeReport();
  }
  bodyError =
    bodyError && leftError ? new AggregateError([bodyError, leftError], 'The canary failed.') : bodyError || leftError;
  if (cleanupError) {
    console.error(
      `Cleanup did not finish. Keep ${options.stateFile} and run:\n${cleanupCommand(options, PREFIX, SCRIPT)}`
    );
  }
  if (bodyError && cleanupError) {
    throw new AggregateError([bodyError, cleanupError], `The canary and its cleanup failed.`);
  }
  if (bodyError) throw bodyError;
  if (cleanupError) throw cleanupError;
  console.info(`Static site canary passed for ${stackName}, and its deletion was verified.`);
};

if (import.meta.main) {
  runStaticSiteCanary({ cleanupOnly: process.argv.includes('--cleanup-only') }).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
