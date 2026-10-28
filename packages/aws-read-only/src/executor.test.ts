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
      if (request.url === '/v1/describejobs') {
        requests.push('batch.DescribeJobs');
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(
          JSON.stringify({
            jobs: [
              {
                jobId: 'job-1',
                jobName: 'report',
                jobQueue: 'arn:aws:batch:us-west-1:123456789012:job-queue/shop-dev-queue',
                jobDefinition: 'arn:aws:batch:us-west-1:123456789012:job-definition/shop-dev-report-job-definition:3',
                status: 'RUNNING',
                startedAt: 1761660000000,
                container: { environment: [{ name: 'STP_TRIGGER_EVENT_DATA', value: 'override_secret_value' }] },
                eksProperties: {
                  podProperties: { containers: [{ env: [{ name: 'T', value: 'eks_job_secret_value' }] }] }
                }
              }
            ]
          })
        );
        return;
      }
      if (request.url === '/v1/describejobdefinitions') {
        requests.push('batch.DescribeJobDefinitions');
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(
          JSON.stringify({
            jobDefinitions: [
              {
                jobDefinitionName: 'shop-dev-report-job-definition',
                jobDefinitionArn:
                  'arn:aws:batch:us-west-1:123456789012:job-definition/shop-dev-report-job-definition:3',
                revision: 3,
                type: 'container',
                containerProperties: {
                  image: '123456789012.dkr.ecr.us-west-1.amazonaws.com/shop:report',
                  environment: [{ name: 'PAYMENT_TOKEN', value: 'sk_live_batch_secret_value' }],
                  secrets: [
                    { name: 'DB_PASSWORD', valueFrom: 'arn:aws:secretsmanager:us-west-1:123456789012:secret:db' }
                  ]
                }
              },
              {
                jobDefinitionName: 'shop-dev-eks-job-definition',
                type: 'container',
                eksProperties: {
                  podProperties: {
                    containers: [{ name: 'app', env: [{ name: 'EKS_TOKEN', value: 'eks_container_secret_value' }] }],
                    initContainers: [{ name: 'init', env: [{ name: 'INIT_TOKEN', value: 'eks_init_secret_value' }] }]
                  }
                }
              },
              {
                jobDefinitionName: 'shop-dev-multinode-job-definition',
                type: 'multinode',
                nodeProperties: {
                  nodeRangeProperties: [
                    {
                      targetNodes: '0:',
                      container: { environment: [{ name: 'NODE_TOKEN', value: 'node_range_secret_value' }] },
                      eksProperties: {
                        podProperties: { containers: [{ env: [{ name: 'NODE_EKS', value: 'node_eks_secret_value' }] }] }
                      }
                    }
                  ]
                }
              }
            ]
          })
        );
        return;
      }
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

// r2qq finding 8: a batch job's diagnostics read its job definition; its environment values stay out of the result.
test('Batch job definitions are readable with ECS, EKS and multi-node environment values redacted', async () => {
  const result = await executeAwsSdkCommand(
    'batch',
    'DescribeJobDefinitions',
    { jobDefinitionName: 'shop-dev-report-job-definition' },
    context()
  );
  expect(result.ok).toBeTrue();
  for (const secret of [
    'sk_live_batch_secret_value',
    'eks_container_secret_value',
    'eks_init_secret_value',
    'node_range_secret_value',
    'node_eks_secret_value'
  ]) {
    expect(JSON.stringify(result)).not.toContain(secret);
  }
  // A secret given by reference is an ARN; it stays readable.
  expect(JSON.stringify(result)).toContain('arn:aws:secretsmanager:us-west-1:123456789012:secret:db');
  const [definition] = (result.ok ? (result.data as { jobDefinitions: unknown[] }).jobDefinitions : []) as object[];
  expect(definition).toMatchObject({
    containerProperties: { environment: [{ name: 'PAYMENT_TOKEN', value: '[redacted]' }] }
  });
});

test('Batch jobs keep the container overrides and EKS environment of the run redacted', async () => {
  const result = await executeAwsSdkCommand('batch', 'DescribeJobs', { jobs: ['job-1'] }, context());
  expect(result.ok).toBeTrue();
  for (const secret of ['override_secret_value', 'eks_job_secret_value']) {
    expect(JSON.stringify(result)).not.toContain(secret);
  }
  expect(result).toMatchObject({
    data: { jobs: [{ container: { environment: [{ name: 'STP_TRIGGER_EVENT_DATA', value: '[redacted]' }] } }] }
  });
});
