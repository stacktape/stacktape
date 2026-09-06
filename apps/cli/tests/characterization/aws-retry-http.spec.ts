import { afterAll, expect, test } from 'bun:test';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AwsCloudFormationStacks } from '../../src/aws/cloudformation-stacks';
import { retryPlugin } from '../../src/aws/client-middleware';
import { createFetchHandler } from '../../src/aws/fetch-handler';

let failure = 'ValidationError';
let requests = 0;
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch() {
    requests++;
    if (failure === 'Throttling' && requests > 1) {
      return new Response(
        '<ListStackResourcesResponse><ListStackResourcesResult><StackResourceSummaries/></ListStackResourcesResult></ListStackResourcesResponse>',
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }
    const message =
      failure === 'ValidationError'
        ? 'Stack with id fixture does not exist'
        : failure === 'Throttling'
          ? 'Rate exceeded'
          : 'Access denied';
    return new Response(
      `<ErrorResponse><Error><Type>Sender</Type><Code>${failure}</Code><Message>${message}</Message></Error><RequestId>fixture-request</RequestId></ErrorResponse>`,
      { status: 400, headers: { 'Content-Type': 'text/xml' } }
    );
  }
});
const client = new CloudFormationClient({
  region: 'eu-west-1',
  endpoint: server.url.origin,
  credentials: { accessKeyId: 'fixture-key', secretAccessKey: 'fixture-secret' },
  maxAttempts: 1,
  requestHandler: createFetchHandler()
});
client.middlewareStack.use(retryPlugin);
const cloudFormation = new AwsCloudFormationStacks({
  createClient: () => client,
  getErrorHandler: () => (error) => {
    throw error;
  }
});
afterAll(() => {
  client.destroy();
  server.stop(true);
});

test('the real retry middleware preserves missing-stack errors for normal creation preflight', async () => {
  failure = 'ValidationError';
  requests = 0;
  expect(await cloudFormation.getDetails('fixture')).toBeNull();
  expect(await cloudFormation.getResources('fixture')).toEqual([]);
  expect(requests).toBe(2);
});
test('an AWS denial retains its error code and message instead of becoming a retry context', async () => {
  failure = 'AccessDenied';
  requests = 0;
  await expect(cloudFormation.getDetails('fixture')).rejects.toMatchObject({
    name: 'AccessDenied',
    message: 'Access denied'
  });
  expect(requests).toBe(1);
});
test('transient AWS errors are retried through the installed retry library', async () => {
  failure = 'Throttling';
  requests = 0;
  expect(await cloudFormation.getResources('fixture')).toEqual([]);
  expect(requests).toBe(2);
}, 15_000);
