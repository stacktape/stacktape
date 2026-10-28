/**
 * Several SQS functions on one queue: init keeps them there, as it always has, and says what that means. A README
 * about a topic fanning out is named in the gap but never acted on: prose can say the opposite, and a guessed
 * subscription or delivery format breaks every message.
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

const compose = async (extra: Record<string, string> = {}) => {
  const files: Record<string, string> = {
    'package.json': JSON.stringify({ name: 'parcel', dependencies: { '@aws-sdk/client-sns': '^3.0.0' } }),
    'src/create.ts':
      "import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';\nexport const create = (id: string) => new SNSClient({}).send(new PublishCommand({ TopicArn: process.env.PARCEL_TOPIC_ARN, Message: JSON.stringify({ id }) }));\n",
    'functions/billing.ts': consumer("console.log('billing', JSON.parse(record.body).id);"),
    'functions/audit.ts': consumer("console.log('audit', JSON.parse(record.body).id);"),
    ...extra
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

const SHARED_QUEUE =
  'audit and billing both consume jobQueue, so each message reaches only one of them. If each consumer must receive every message, give each its own queue subscribed to notificationsTopic before deploying: an sqs-queue and sqs event per consumer, an AWS::SNS::Subscription in cloudformationResources, and a policyStatements entry on the queue that lets sns.amazonaws.com send to it.';

describe('consumers sharing one queue', () => {
  it.each([
    ['no README', {}, ''],
    [
      'a README saying the topic fans out to their queues',
      {
        'README.md':
          '# Parcel\n\nCreating a parcel publishes its id to PARCEL_TOPIC_ARN (SNS), which fans out to billingQueue and auditQueue.\n'
      },
      ' README.md line 3 names billingQueue and auditQueue in a sentence about a topic.'
    ],
    [
      'a README saying the opposite',
      {
        'README.md':
          '# Parcel\n\nThe SNS topic does not fan out to billingQueue and auditQueue; both compete on jobQueue.\n'
      },
      ' README.md line 3 names billingQueue, auditQueue and jobQueue in a sentence about a topic.'
    ],
    [
      // The envelope can be read in a helper the handler imports, so no delivery format is safe to guess.
      'a handler that reads the SNS envelope through an imported helper',
      {
        'README.md': 'The SNS topic fans out to billingQueue and auditQueue.\n',
        'functions/envelope.ts': 'export const payloadOf = (body: string) => JSON.parse(JSON.parse(body).Message);\n',
        'functions/audit.ts': consumer(
          "const { payloadOf } = await import('./envelope');\n    console.log('audit', payloadOf(record.body).id);"
        )
      },
      ' README.md line 1 names billingQueue and auditQueue in a sentence about a topic.'
    ]
  ])(
    'with %s, they keep sharing it and the result says each needs its own subscribed queue',
    async (_case, extra, hint) => {
      const { config, gaps } = await compose(extra);

      expect(queueOf(config.resources, 'billing')).toBe('jobQueue');
      expect(queueOf(config.resources, 'audit')).toBe('jobQueue');
      expect(Object.keys(config.resources).filter((name) => name.endsWith('Queue'))).toEqual(['jobQueue']);
      expect(config.resources.jobQueue!.properties).toEqual({});
      expect('cloudformationResources' in config).toBe(false);
      expect(gaps.filter(({ subject }) => subject === 'jobQueue.consumers')).toEqual([
        {
          subject: 'jobQueue.consumers',
          message: `${SHARED_QUEUE}${hint} Leave it as is only if they share the work on purpose.`
        }
      ]);
    }
  );
});
