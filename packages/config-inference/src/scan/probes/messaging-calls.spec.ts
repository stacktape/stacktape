/**
 * The messaging-calls probe: an SNS publish or SQS send whose target comes from an environment variable proves that
 * resource in any language, and names the variable that addresses it.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { createProbeContext } from '../assemble';
import { messagingCallsProbe } from './messaging-calls';

let root: string | undefined;

afterEach(async () => {
  if (root !== undefined) await rm(root, { recursive: true, force: true });
  root = undefined;
});

const run = async (files: Record<string, string>) => {
  root = await mkdtemp(join(tmpdir(), 'stp-messaging-calls-'));
  const directory = root;
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      await mkdir(join(directory, path, '..'), { recursive: true });
      await writeFile(join(directory, path), contents, 'utf8');
    })
  );
  const output = await messagingCallsProbe.run(createProbeContext(root, Object.keys(files)));
  return (output.dependencies ?? []).map(({ name, kind, addressedBy, evidence }) => ({
    name,
    kind,
    addressedBy,
    evidence: evidence.map(({ file, quote }) => ({ file, quote }))
  }));
};

// The variable is cited, and left to the source scan to bind to the services that read it.
describe('the messaging-calls probe', () => {
  it.each([
    [
      'Ruby',
      'api/app/controllers/parcels_controller.rb',
      "Aws::SNS::Client.new.publish(topic_arn: ENV.fetch('PARCEL_TOPIC_ARN'), message: {id: 1}.to_json)\n",
      "ENV.fetch('PARCEL_TOPIC_ARN'"
    ],
    [
      'Python',
      'app/notify.py',
      "import boto3\nsns = boto3.client('sns')\nsns.publish(TopicArn=os.environ['PARCEL_TOPIC_ARN'], Message='hi')\n",
      "os.environ['PARCEL_TOPIC_ARN'"
    ],
    [
      'TypeScript',
      'src/notify.ts',
      "import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';\nawait sns.send(new PublishCommand({ TopicArn: process.env.PARCEL_TOPIC_ARN, Message: body }));\n",
      'process.env.PARCEL_TOPIC_ARN'
    ],
    [
      'Go',
      'cmd/notify/main.go',
      'import "github.com/aws/aws-sdk-go-v2/service/sns"\nclient.Publish(ctx, &sns.PublishInput{TopicArn: aws.String(os.Getenv("PARCEL_TOPIC_ARN")), Message: aws.String(m)})\n',
      'os.Getenv("PARCEL_TOPIC_ARN"'
    ],
    [
      'TypeScript, through a local name',
      'src/notify.ts',
      "import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';\nconst topicArn = process.env.PARCEL_TOPIC_ARN!;\nexport const send = (Message: string) => sns.send(new PublishCommand({ TopicArn: topicArn, Message }));\n",
      'process.env.PARCEL_TOPIC_ARN'
    ]
  ])('%s: a publish to the topic its variable names is that topic', async (_language, path, source, quote) => {
    expect(await run({ [path]: source })).toEqual([
      {
        name: 'notificationsTopic',
        kind: 'topic',
        addressedBy: [],
        evidence: [{ file: path, quote }]
      }
    ]);
  });

  it('a send to the queue its variable names is that queue', async () => {
    expect(
      await run({
        'worker/enqueue.rb':
          "sqs = Aws::SQS::Client.new\nsqs.send_message(queue_url: ENV['JOBS_QUEUE_URL'], message_body: '{}')\n"
      })
    ).toEqual([
      {
        name: 'jobQueue',
        kind: 'queue',
        addressedBy: [],
        evidence: [{ file: 'worker/enqueue.rb', quote: "ENV['JOBS_QUEUE_URL'" }]
      }
    ]);
  });

  it('claims nothing it cannot tie to one variable, and leaves declared infrastructure to its own probe', async () => {
    // Two topic variables may be two topics or one.
    expect(
      await run({
        'app/notify.py':
          "sns = boto3.client('sns')\nsns.publish(TopicArn=os.environ['ORDERS_TOPIC_ARN'], Message='a')\nsns.publish(TopicArn=os.environ['REFUNDS_TOPIC_ARN'], Message='b')\n"
      })
    ).toEqual([]);
    // A hard-coded or computed ARN names no variable; a field elsewhere on the line is not the target.
    expect(
      await run({
        'src/notify.ts':
          "import '@aws-sdk/client-sns';\nsend({ TopicArn: arnFor(region), Message: process.env.GREETING });\nsend({ TopicArn: 'arn:aws:sns:eu-west-1:1:t' });\n"
      })
    ).toEqual([]);
    // Tests and fixtures do not deploy.
    expect(
      await run({ 'tests/notify.test.ts': "import '@aws-sdk/client-sns';\nx({ TopicArn: process.env.TOPIC_ARN });\n" })
    ).toEqual([]);
    expect(
      await run({
        'serverless.yml': 'service: app\n',
        'src/notify.ts': "import '@aws-sdk/client-sns';\nx({ TopicArn: process.env.TOPIC_ARN });\n"
      })
    ).toEqual([]);
  });
});
