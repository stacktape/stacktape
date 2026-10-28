/**
 * SNS fanout: consumers the project says each get every message have their own queues, subscribed to the topic. When
 * the project does not say so, the consumers keep sharing one queue and the composed result says what that means.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '../compose/compose';
import { assembleCandidateFacts } from './assemble';
import { lambdaSourceProbe } from './probes/lambda-source';
import { manifestProbe } from './probes/manifest';
import { messagingCallsProbe } from './probes/messaging-calls';

let root: string | undefined;

afterEach(async () => {
  if (root !== undefined) await rm(root, { recursive: true, force: true });
  root = undefined;
});

const consumer = (body: string) =>
  `import type { SQSEvent } from 'aws-lambda';\nexport const handler = async (event: SQSEvent) => {\n  for (const record of event.Records) {\n    ${body}\n  }\n};\n`;

const compose = async ({ readme, audit }: { readme?: string; audit?: string } = {}) => {
  const files: Record<string, string> = {
    'package.json': JSON.stringify({ name: 'parcel', dependencies: { '@aws-sdk/client-sns': '^3.0.0' } }),
    'src/create.ts':
      "import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';\nexport const create = (id: string) => new SNSClient({}).send(new PublishCommand({ TopicArn: process.env.PARCEL_TOPIC_ARN, Message: JSON.stringify({ id }) }));\n",
    'functions/billing.ts': consumer("console.log('billing', JSON.parse(record.body).id);"),
    'functions/audit.ts': audit ?? consumer("console.log('audit', JSON.parse(record.body).id);"),
    ...(readme === undefined ? {} : { 'README.md': readme })
  };
  root = await mkdtemp(join(tmpdir(), 'stp-topic-fanout-'));
  const directory = root;
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      await mkdir(join(directory, path, '..'), { recursive: true });
      await writeFile(join(directory, path), contents, 'utf8');
    })
  );
  const { facts } = await assembleCandidateFacts({
    root,
    probes: [manifestProbe, lambdaSourceProbe, messagingCallsProbe]
  });
  return composeConfig({ facts });
};

const queueOf = (resources: Record<string, { properties: Record<string, unknown> }>, name: string) =>
  (resources[name]!.properties.events as Array<{ properties: { sqsQueueName: string } }>)[0]!.properties.sqsQueueName;

const FANOUT_README =
  '# Parcel\n\nCreating a parcel publishes its id to PARCEL_TOPIC_ARN (SNS), which fans out to billingQueue and auditQueue. Each queue invokes its own handler.\n';

describe('SNS fanout', () => {
  it('gives each consumer the queue the README names for it, subscribed to the topic', async () => {
    const { config, gaps } = await compose({ readme: FANOUT_README });

    expect(
      Object.keys(config.resources)
        .filter((name) => /Queue|Topic/.test(name))
        .toSorted()
    ).toEqual(['auditQueue', 'billingQueue', 'notificationsTopic']);
    expect(queueOf(config.resources, 'billing')).toBe('billingQueue');
    expect(queueOf(config.resources, 'audit')).toBe('auditQueue');
    // Stacktape writes the queue's policy itself; a raw AWS::SQS::QueuePolicy beside it would replace one or the other.
    expect(config.resources.billingQueue!.properties.policyStatements).toEqual([
      {
        Effect: 'Allow',
        Principal: { Service: 'sns.amazonaws.com' },
        Action: ['sqs:SendMessage'],
        Condition: { ArnEquals: { 'aws:SourceArn': "$ResourceParam('notificationsTopic', 'arn')" } }
      }
    ]);
    // Both consumers parse the published message itself, which only raw delivery gives them.
    expect(config.cloudformationResources).toEqual({
      billingQueueSubscription: {
        Type: 'AWS::SNS::Subscription',
        Properties: {
          Protocol: 'sqs',
          TopicArn: "$ResourceParam('notificationsTopic', 'arn')",
          Endpoint: "$ResourceParam('billingQueue', 'arn')",
          RawMessageDelivery: true
        }
      },
      auditQueueSubscription: {
        Type: 'AWS::SNS::Subscription',
        Properties: {
          Protocol: 'sqs',
          TopicArn: "$ResourceParam('notificationsTopic', 'arn')",
          Endpoint: "$ResourceParam('auditQueue', 'arn')",
          RawMessageDelivery: true
        }
      }
    });
    expect(gaps.filter(({ subject }) => subject.endsWith('.consumers'))).toEqual([]);
  });

  it('keeps the SNS envelope for a consumer that reads its Message', async () => {
    const { config } = await compose({
      readme: FANOUT_README,
      audit: consumer("console.log('audit', JSON.parse(JSON.parse(record.body).Message).id);")
    });

    expect(
      Object.fromEntries(
        Object.entries(config.cloudformationResources ?? {}).map(([name, resource]) => [
          name,
          resource.Properties.RawMessageDelivery
        ])
      )
    ).toEqual({ billingQueueSubscription: true, auditQueueSubscription: false });
  });

  it.each([
    ['no README', undefined],
    ['a README that names no queues', '# Parcel\n\nCreating a parcel publishes its id to an SNS topic.\n'],
    [
      "queue names that are not the consumers' names",
      '# Parcel\n\nThe SNS topic fans out to invoiceQueue and historyQueue.\n'
    ]
  ])(
    'with %s, the consumers keep sharing one queue and the result says fanout needs one each',
    async (_case, readme) => {
      const { config, gaps } = await compose(readme === undefined ? {} : { readme });

      expect(queueOf(config.resources, 'billing')).toBe('jobQueue');
      expect(queueOf(config.resources, 'audit')).toBe('jobQueue');
      expect(config.cloudformationResources).toBeUndefined();
      expect(gaps.filter(({ subject }) => subject === 'jobQueue.consumers')).toEqual([
        {
          subject: 'jobQueue.consumers',
          message: expect.stringContaining(
            'audit and billing both consume jobQueue, so each message reaches only one of them. If notificationsTopic should deliver every message to each of them, fanout needs one queue per consumer'
          )
        }
      ]);
    }
  );
});
