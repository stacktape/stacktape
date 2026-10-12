import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import {
  CloudFormationClient,
  CreateStackCommand,
  DeleteStackCommand,
  DescribeStacksCommand,
  ListStackResourcesCommand,
  waitUntilStackCreateComplete,
  waitUntilStackDeleteComplete,
  type StackResourceSummary
} from '@aws-sdk/client-cloudformation';
import { CloudWatchLogsClient, DescribeLogGroupsCommand, DeleteLogGroupCommand } from '@aws-sdk/client-cloudwatch-logs';
import { GetFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { GetRoleCommand, IAMClient } from '@aws-sdk/client-iam';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { fromIni } from '@aws-sdk/credential-providers';
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { synthesizeAppSyncEndpoint } from '../../tests/synthesis-families/endpoint-fixture';

type State = {
  accountId: string;
  stackName: string;
  owner: string;
  stackId?: string;
  resources?: StackResourceSummary[];
  cleaned?: boolean;
};
const region = 'eu-west-1';

/** Real AWS owns request delivery and IAM enforcement; every infrastructure connection is synthesized by the product. */
export const runAppSyncEndpointCanary = async (cleanupOnly = false) => {
  assert.equal(process.env.STP_ENDPOINT_CANARY_DEPLOY, '1', 'Set STP_ENDPOINT_CANARY_DEPLOY=1 to opt into live AWS');
  assert.equal(process.env.STP_ENDPOINT_CANARY_CONFIRM_DISPOSABLE, 'this-is-a-disposable-test-account');
  assert(
    !Object.keys(process.env).some((name) => name.startsWith('AWS_ENDPOINT_URL')),
    'Live AWS refuses endpoint overrides'
  );
  const accountId = process.env.STP_ENDPOINT_CANARY_EXPECTED_ACCOUNT_ID;
  assert(accountId && /^\d{12}$/.test(accountId), 'An explicit expected account is required');
  const projectName =
    process.env.STP_ENDPOINT_CANARY_PROJECT ??
    `v4endpoint-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
  assert(/^v4endpoint-[a-z0-9-]{1,28}$/.test(projectName));
  const owner = process.env.STP_ENDPOINT_CANARY_OWNER;
  assert(owner && /^[a-zA-Z0-9._-]{1,80}$/.test(owner), 'An explicit owner is required');
  const stateFile = process.env.STP_ENDPOINT_CANARY_STATE_FILE;
  assert(stateFile && isAbsolute(stateFile), 'An absolute recovery state path is required');
  const stackName = `${projectName}-test`;
  const credentials = fromIni({ profile: 'stacktape-e2e', ignoreCache: true });
  const config = { credentials, region, ignoreConfiguredEndpointUrls: true, maxAttempts: 2 };
  const sts = new STSClient(config);
  const cfn = new CloudFormationClient(config);
  const lambda = new LambdaClient(config);
  const iam = new IAMClient(config);
  const logs = new CloudWatchLogsClient(config);
  const signer = new SignatureV4({ credentials, region, service: 'appsync', sha256: Sha256 });
  const signedFetch = async (url: URL, body?: string) => {
    assert.equal(url.protocol, 'https:');
    assert(
      url.hostname.endsWith(`.appsync-api.${region}.amazonaws.com`) ||
        url.hostname === `appsync.${region}.amazonaws.com`
    );
    const request = await signer.sign(
      new HttpRequest({
        protocol: url.protocol,
        hostname: url.hostname,
        path: url.pathname,
        method: body ? 'POST' : 'GET',
        headers: { host: url.hostname, ...(body ? { 'content-type': 'application/json' } : {}) },
        body
      })
    );
    return fetch(url, {
      method: request.method,
      headers: request.headers,
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(15_000)
    });
  };
  let state: State = { accountId, stackName, owner };
  let attempted = false;
  const interrupted = new AbortController();
  const onSignal = () => interrupted.abort(new Error('Endpoint canary interrupted'));
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  let bodyError: unknown;
  let cleanupError: unknown;
  const save = () => writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  const describe = async () => {
    try {
      return (await cfn.send(new DescribeStacksCommand({ StackName: stackName }))).Stacks?.[0];
    } catch (error) {
      if (error instanceof Error && /does not exist/.test(error.message)) return undefined;
      throw error;
    }
  };
  const stateFileArgument = "'" + stateFile.replaceAll("'", "'\"'\"'") + "'";
  const recoverCommand = `STP_ENDPOINT_CANARY_DEPLOY=1 STP_ENDPOINT_CANARY_CONFIRM_DISPOSABLE=this-is-a-disposable-test-account STP_ENDPOINT_CANARY_EXPECTED_ACCOUNT_ID=${accountId} STP_ENDPOINT_CANARY_PROJECT=${projectName} STP_ENDPOINT_CANARY_OWNER=${owner} STP_ENDPOINT_CANARY_STATE_FILE=${stateFileArgument} pnpm --filter @stacktape/cli run test:real-aws-endpoint -- --cleanup-only`;
  const cleanup = async () => {
    const stack = await describe();
    if (stack) {
      assert.equal(
        stack.Tags?.find((tag) => tag.Key === 'stacktape-canary-owner')?.Value,
        owner,
        'Cleanup refused: owner mismatch'
      );
      if (state.stackId) assert.equal(stack.StackId, state.stackId, 'Cleanup refused: stack identity changed');
      state.stackId = stack.StackId;
      state.resources = (
        await cfn.send(new ListStackResourcesCommand({ StackName: stack.StackId }))
      ).StackResourceSummaries;
      await save();
      await cfn.send(new DeleteStackCommand({ StackName: stack.StackId }));
      const deleted = await waitUntilStackDeleteComplete(
        { client: cfn, maxWaitTime: 180, minDelay: 2, maxDelay: 5 },
        { StackName: stack.StackId }
      );
      assert.equal(deleted.state, 'SUCCESS');
    }
    assert.equal(await describe(), undefined, 'Stack still exists');
    for (const resource of state.resources ?? []) {
      const id = resource.PhysicalResourceId;
      if (!id) continue;
      if (resource.ResourceType === 'AWS::Lambda::Function')
        await assert.rejects(lambda.send(new GetFunctionCommand({ FunctionName: id })), {
          name: 'ResourceNotFoundException'
        });
      if (resource.ResourceType === 'AWS::IAM::Role')
        await assert.rejects(iam.send(new GetRoleCommand({ RoleName: id })), { name: 'NoSuchEntityException' });
      if (resource.ResourceType === 'AWS::Logs::LogGroup') {
        const pending = await logs.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: id }));
        if (pending.logGroups?.some((group) => group.logGroupName === id))
          await logs.send(new DeleteLogGroupCommand({ logGroupName: id }));
        const groups = await logs.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: id }));
        assert(!groups.logGroups?.some((group) => group.logGroupName === id), `Log group remains: ${id}`);
      }
      if (resource.ResourceType === 'AWS::AppSync::GraphQLApi') {
        const response = await signedFetch(
          new URL(`https://appsync.${region}.amazonaws.com/v1/apis/${id.split('/').at(-1)}`)
        );
        assert.equal(response.status, 404, 'GraphQL API remains');
      }
    }
    state.cleaned = true;
    await save();
    console.log(`Cleanup verified for ${stackName}`);
  };
  try {
    assert.equal((await sts.send(new GetCallerIdentityCommand({}))).Account, accountId, 'Account mismatch');
    if (cleanupOnly) {
      state = JSON.parse(await readFile(stateFile, 'utf8')) as State;
      assert.equal(state.accountId, accountId);
      assert.equal(state.stackName, stackName);
      assert.equal(state.owner, owner);
      try {
        await cleanup();
      } catch (error) {
        console.error(`Recovery: ${recoverCommand}`);
        throw error;
      }
      return;
    }
    assert.equal(await describe(), undefined, 'Refusing an existing stack');
    const template = await synthesizeAppSyncEndpoint({ accountId, projectName, region });
    const previous = await readFile(stateFile, 'utf8').catch((error: unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
      throw error;
    });
    if (previous)
      assert.equal((JSON.parse(previous) as State).cleaned, true, 'Refusing to overwrite an unfinished recovery state');
    await save();
    interrupted.signal.throwIfAborted();
    attempted = true;
    const created = await cfn.send(
      new CreateStackCommand({
        StackName: stackName,
        TemplateBody: JSON.stringify(template),
        Capabilities: ['CAPABILITY_NAMED_IAM'],
        Tags: [{ Key: 'stacktape-canary-owner', Value: owner }]
      })
    );
    state.stackId = created.StackId;
    await save();
    const ready = await waitUntilStackCreateComplete(
      { client: cfn, maxWaitTime: 180, minDelay: 2, maxDelay: 5, abortSignal: interrupted.signal },
      { StackName: created.StackId }
    );
    assert.equal(ready.state, 'SUCCESS');
    const stack = await describe();
    const endpoint = stack?.Outputs?.find((output) => output.OutputKey === 'Endpoint')?.OutputValue;
    assert(endpoint, 'Synthesized GraphQL endpoint missing');
    const url = new URL(endpoint);
    const body = JSON.stringify({
      query: 'query($id: ID!) { user(id: $id) { id name } }',
      variables: { id: 't05-request' }
    });
    const denied = await fetch(url, {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(15_000)
    });
    assert.equal(denied.status, 401, 'Unsigned GraphQL request was accepted');
    const response = await signedFetch(url, body);
    assert.equal(response.status, 200);
    assert.deepEqual(
      await response.json(),
      { data: { user: { id: 't05-request', name: 'endpoint-canary' } } },
      'GraphQL did not reach its configured Lambda'
    );
    console.log('AppSync request reached the synthesized Lambda; unsigned access was denied');
  } catch (error) {
    bodyError = error;
  } finally {
    try {
      if (attempted) {
        try {
          await cleanup();
        } catch (error) {
          console.error(`Recovery: ${recoverCommand}`);
          cleanupError = error;
        }
      }
    } finally {
      process.off('SIGINT', onSignal);
      process.off('SIGTERM', onSignal);
      for (const client of [sts, cfn, lambda, iam, logs]) client.destroy();
    }
  }
  if (bodyError && cleanupError)
    throw new AggregateError([bodyError, cleanupError], 'Endpoint request and cleanup failed');
  if (bodyError) throw bodyError;
  if (cleanupError) throw cleanupError;
};

if (import.meta.main)
  runAppSyncEndpointCanary(process.argv.includes('--cleanup-only')).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
