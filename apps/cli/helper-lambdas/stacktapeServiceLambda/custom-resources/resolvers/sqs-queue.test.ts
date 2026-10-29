import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { SQSClient } from '@aws-sdk/client-sqs';
import { getAttributeUpdate, getQueueAttributes, sqsQueue, sqsQueueSettings } from './sqs-queue';
import { sqsQueuePolicy } from './sqs-queue-policy';

type Command = { constructor: { name: string }; input: Record<string, any> };

const awsError = (name: string) => Object.assign(new Error(name), { name });
const url = 'https://sqs.eu-west-1.amazonaws.com/123456789012/app-prod-jobs';

describe('queue attributes', () => {
  test.each([
    {
      name: 'CloudFormation strings and objects become SQS attribute strings',
      props: {
        QueueName: 'q',
        VisibilityTimeout: '60',
        RedrivePolicy: { deadLetterTargetArn: 'arn:dlq', maxReceiveCount: '3' }
      },
      expected: { VisibilityTimeout: '60', RedrivePolicy: '{"deadLetterTargetArn":"arn:dlq","maxReceiveCount":"3"}' }
    },
    {
      name: 'a standard queue leaves out the FIFO attributes SQS rejects there',
      props: { QueueName: 'q', FifoQueue: 'false', ContentBasedDeduplication: 'false', DeduplicationScope: 'queue' },
      expected: {}
    },
    {
      name: 'a FIFO queue keeps them',
      props: { QueueName: 'q.fifo', FifoQueue: 'true', ContentBasedDeduplication: 'true' },
      expected: { FifoQueue: 'true', ContentBasedDeduplication: 'true' }
    }
  ])('$name', ({ props, expected }) => {
    expect(getQueueAttributes(props)).toEqual(expected);
  });

  test.each([
    {
      name: 'from SSE-SQS off to SSE-KMS',
      previous: { SqsManagedSseEnabled: 'false' },
      current: { KmsMasterKeyId: 'alias/key' },
      expected: { KmsMasterKeyId: 'alias/key' }
    },
    {
      name: 'from SSE-KMS to no encryption',
      previous: { KmsMasterKeyId: 'alias/key', SqsManagedSseEnabled: 'false' },
      current: { SqsManagedSseEnabled: 'false' },
      expected: { KmsMasterKeyId: '' }
    },
    {
      name: 'from SSE-KMS to the default',
      previous: { KmsMasterKeyId: 'alias/key' },
      current: {},
      expected: { SqsManagedSseEnabled: 'true' }
    }
  ])('a queue keeps one encryption mode: $name', ({ previous, current, expected }) => {
    expect(getAttributeUpdate({ QueueName: 'q', ...current }, { QueueName: 'q', ...previous })).toEqual(expected);
  });

  test('an update sets changed attributes and puts removed ones back to what SQS gives a new queue', () => {
    expect(
      getAttributeUpdate(
        { QueueName: 'q', VisibilityTimeout: '90', DelaySeconds: '0' },
        {
          QueueName: 'q',
          VisibilityTimeout: '60',
          MaximumMessageSize: '2048',
          RedrivePolicy: { deadLetterTargetArn: 'arn:dlq', maxReceiveCount: '3' },
          KmsMasterKeyId: 'alias/key'
        }
      )
    ).toEqual({
      VisibilityTimeout: '90',
      DelaySeconds: '0',
      MaximumMessageSize: '1048576',
      RedrivePolicy: '',
      SqsManagedSseEnabled: 'true'
    });
  });
});

describe('sqsQueue', () => {
  const calls: { name: string; input: Record<string, any> }[] = [];
  let existing: string | undefined;
  let createFailures: string[] = [];
  const original = { ...sqsQueueSettings };
  let stub: { mockRestore: () => void };

  beforeEach(() => {
    Object.assign(sqsQueueSettings, { retryIntervalMs: 1, recentlyDeletedRetryMs: 50 });
    calls.length = 0;
    existing = undefined;
    createFailures = [];
    stub = spyOn(SQSClient.prototype, 'send').mockImplementation((async (command: Command) => {
      const name = command.constructor.name.replace('Command', '');
      calls.push({ name, input: command.input });
      if (name === 'GetQueueUrl') {
        if (!existing) throw awsError('QueueDoesNotExist');
        return { QueueUrl: existing };
      }
      if (name === 'CreateQueue') {
        const failure = createFailures.shift();
        if (failure) throw awsError(failure);
        existing = url;
        return { QueueUrl: url };
      }
      if (name === 'GetQueueAttributes')
        return { Attributes: { QueueArn: 'arn:aws:sqs:eu-west-1:123456789012:app-prod-jobs' } };
      if (name === 'ListQueueTags') return { Tags: { old: '1', keep: 'same' } };
      if (name === 'DeleteQueue') {
        if (!existing) throw awsError('QueueDoesNotExist');
        existing = undefined;
      }
      return {};
    }) as any);
  });
  afterEach(() => {
    stub.mockRestore();
    Object.assign(sqsQueueSettings, original);
  });

  const props = { QueueName: 'app-prod-jobs', VisibilityTimeout: '60', Tags: [{ Key: 'keep', Value: 'same' }] };

  test('create returns the URL as physical ID and the AWS::SQS::Queue attributes', async () => {
    const result = await sqsQueue(props, undefined, 'Create');
    expect(result).toEqual({
      physicalResourceId: url,
      data: { Arn: 'arn:aws:sqs:eu-west-1:123456789012:app-prod-jobs', QueueName: 'app-prod-jobs', QueueUrl: url }
    });
    expect(calls.find(({ name }) => name === 'CreateQueue')?.input).toEqual({
      QueueName: 'app-prod-jobs',
      Attributes: { VisibilityTimeout: '60' },
      tags: { keep: 'same' }
    });
  });

  test('create does not take over an existing queue', async () => {
    existing = url;
    await expect(sqsQueue(props, undefined, 'Create')).rejects.toThrow(/already exists/);
    expect(calls.map(({ name }) => name)).toEqual(['GetQueueUrl']);
  });

  test('create waits out the 60 s after a queue with the same name was deleted', async () => {
    createFailures = ['QueueDeletedRecently', 'QueueDeletedRecently'];
    await sqsQueue(props, undefined, 'Create');
    expect(calls.filter(({ name }) => name === 'CreateQueue')).toHaveLength(3);
  });

  test('update changes attributes and tags in place', async () => {
    existing = url;
    await sqsQueue({ ...props, VisibilityTimeout: '90' }, props, 'Update', url);
    expect(calls.find(({ name }) => name === 'SetQueueAttributes')?.input).toEqual({
      QueueUrl: url,
      Attributes: { VisibilityTimeout: '90' }
    });
    expect(calls.find(({ name }) => name === 'UntagQueue')?.input.TagKeys).toEqual(['old']);
    expect(calls.some(({ name }) => name === 'TagQueue')).toBe(false);
  });

  test.each([
    { change: 'name', next: { ...props, QueueName: 'app-prod-other' } },
    { change: 'FIFO setting', next: { ...props, FifoQueue: 'true' } }
  ])('a $change change fails instead of replacing the queue', async ({ next }) => {
    await expect(sqsQueue(next, props, 'Update', url)).rejects.toThrow(/would replace it/);
    expect(calls).toEqual([]);
  });

  test('delete removes only a queue this resource created, and a missing queue is fine', async () => {
    existing = url;
    await sqsQueue(props, undefined, 'Delete', 'stpservicecustomresource');
    expect(calls).toEqual([]);
    await sqsQueue(props, undefined, 'Delete', url);
    await sqsQueue(props, undefined, 'Delete', url);
    expect(calls.map(({ name }) => name)).toEqual(['DeleteQueue', 'DeleteQueue']);
  });
});

describe('sqsQueuePolicy', () => {
  const calls: Record<string, any>[] = [];
  let stub: { mockRestore: () => void };
  beforeEach(() => {
    calls.length = 0;
    stub = spyOn(SQSClient.prototype, 'send').mockImplementation((async (command: Command) => {
      calls.push(command.input);
      if (command.input.QueueUrl === 'gone') throw awsError('QueueDoesNotExist');
      return {};
    }) as any);
  });
  afterEach(() => stub.mockRestore());

  test('sets the policy, keeps its physical ID on update and removes the policy from queues it no longer covers', async () => {
    const created = await sqsQueuePolicy({ PolicyDocument: '{"a":1}', Queues: ['q1'] }, undefined, 'Create');
    expect(created.physicalResourceId).toBe('q1#policy');
    const updated = await sqsQueuePolicy(
      { PolicyDocument: '{"a":2}', Queues: ['q2'] },
      { PolicyDocument: '{"a":1}', Queues: ['q1'] },
      'Update',
      'q1#policy'
    );
    expect(updated.physicalResourceId).toBe('q1#policy');
    await sqsQueuePolicy({ PolicyDocument: '{"a":2}', Queues: ['q2', 'gone'] }, undefined, 'Delete', 'q1#policy');
    expect(calls.map(({ QueueUrl, Attributes }) => [QueueUrl, Attributes.Policy])).toEqual([
      ['q1', '{"a":1}'],
      ['q2', '{"a":2}'],
      ['q1', ''],
      ['q2', ''],
      ['gone', '']
    ]);
  });
});
