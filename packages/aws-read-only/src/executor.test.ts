import { afterAll, beforeAll, expect, test } from 'bun:test';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { executeAwsSdkCommand } from './executor';

// SQS answers an IAM denial with HTTP 400 and its JSON-protocol error type, as it did for the dev agent's `ListQueues`.
let server: Server;
let endpoint: string;
const requests: string[] = [];

beforeAll(async () => {
  server = createServer((request, response) => {
    request.resume();
    request.on('end', () => {
      const target = String(request.headers['x-amz-target'] ?? '');
      requests.push(target);
      const [status, type, message] = target.endsWith('.ListQueues')
        ? [400, 'com.amazon.coral.service#AccessDeniedException', 'User is not authorized to perform: sqs:listqueues']
        : [400, 'com.amazonaws.sqs#QueueDoesNotExist', 'The specified queue does not exist.'];
      response.writeHead(status, {
        'content-type': 'application/x-amz-json-1.0',
        'x-amzn-query-error': `${type.split('#')[1]};Sender`
      });
      response.end(JSON.stringify({ __type: type, message }));
    });
  });
  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.AWS_ENDPOINT_URL = endpoint;
  delete process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS;
});

afterAll(() => {
  delete process.env.AWS_ENDPOINT_URL;
  server.close();
});

const context = () => ({
  region: 'us-west-1',
  credentials: { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'example-secret' }
});

test('a failed call says whether the catalog refused it, IAM denied it or AWS reported another error', async () => {
  const notAllowed = await executeAwsSdkCommand('lambda', 'Invoke', {}, context());
  expect(notAllowed).toMatchObject({ ok: false, code: 'OPERATION_NOT_ALLOWED' });
  // A refused operation is never sent.
  expect(requests).toEqual([]);

  const denied = await executeAwsSdkCommand('sqs', 'ListQueues', {}, context());
  expect(denied).toMatchObject({ ok: false, code: 'ACCESS_DENIED' });
  expect(denied.ok === false && denied.error).toContain('not authorized');

  const missing = await executeAwsSdkCommand('sqs', 'GetQueueUrl', { QueueName: 'r2ee-missing' }, context());
  expect(missing).toMatchObject({ ok: false, code: 'NOT_FOUND' });
  expect(requests.map((target) => target.split('.').at(-1))).toEqual(['ListQueues', 'GetQueueUrl']);
});
