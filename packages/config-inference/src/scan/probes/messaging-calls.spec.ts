/**
 * The messaging-calls probe: an SNS publish or SQS send whose target comes from an environment variable proves that
 * resource in any language, and names the variable that addresses it.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '../../compose/compose';
import { assembleCandidateFacts, createProbeContext } from '../assemble';
import { languageManifestProbe } from './language-manifests';
import { manifestProbe } from './manifest';
import { messagingCallsProbe } from './messaging-calls';
import { serverEntrypointProbe } from './server-entrypoint';

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

const railsPublisher = (calls: string) => ({
  Gemfile: 'source "https://rubygems.org"\ngem "rails"\ngem "aws-sdk-sns"\ngem "aws-sdk-sqs"\n',
  'app/models/order.rb': `class Order\n  def placed!\n${calls}  end\nend\n`
});
const publish = (variable: string) => `    sns.publish(topic_arn: ENV.fetch('${variable}'), message: id.to_s)\n`;
const send = (variable: string) => `    sqs.send_message(queue_url: ENV.fetch('${variable}'), message_body: id.to_s)\n`;

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
    ],
    [
      'Java, through the request builder',
      'src/main/java/app/Notify.java',
      'import software.amazon.awssdk.services.sns.SnsClient;\nsns.publish(PublishRequest.builder().topicArn(System.getenv("PARCEL_TOPIC_ARN")).message(m).build());\n',
      'System.getenv("PARCEL_TOPIC_ARN"'
    ],
    [
      'C#, in the request type',
      'src/Notify.cs',
      'using Amazon.SimpleNotificationService;\nawait sns.PublishAsync(new PublishRequest { TopicArn = Environment.GetEnvironmentVariable("PARCEL_TOPIC_ARN"), Message = m });\n',
      'Environment.GetEnvironmentVariable("PARCEL_TOPIC_ARN"'
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

  it('gives each variable a call targets its own resource, named after the variable and addressed by it', async () => {
    expect(
      await run({
        'app/notify.py':
          "sns = boto3.client('sns')\nsns.publish(TopicArn=os.environ['ORDERS_TOPIC_ARN'], Message='a')\nsns.publish(TopicArn=os.environ['REFUNDS_TOPIC_ARN'], Message='b')\nsns.publish(TopicArn=os.environ['ORDERS_TOPIC_ARN'], Message='c')\n",
        // A name with nothing of its own is the whole variable's.
        'app/jobs.py':
          "sqs.send_message(QueueUrl=os.environ['SQS_QUEUE_URL'], MessageBody='a')\nsqs.send_message(QueueUrl=os.environ['QUEUE_URL'], MessageBody='b')\n"
      })
    ).toEqual([
      {
        name: 'ordersTopic',
        kind: 'topic',
        addressedBy: ['ORDERS_TOPIC_ARN'],
        evidence: [{ file: 'app/notify.py', quote: "os.environ['ORDERS_TOPIC_ARN'" }]
      },
      {
        name: 'refundsTopic',
        kind: 'topic',
        addressedBy: ['REFUNDS_TOPIC_ARN'],
        evidence: [{ file: 'app/notify.py', quote: "os.environ['REFUNDS_TOPIC_ARN'" }]
      },
      {
        name: 'sqsQueueUrl',
        kind: 'queue',
        addressedBy: ['SQS_QUEUE_URL'],
        evidence: [{ file: 'app/jobs.py', quote: "os.environ['SQS_QUEUE_URL'" }]
      },
      {
        name: 'queueUrl',
        kind: 'queue',
        addressedBy: ['QUEUE_URL'],
        evidence: [{ file: 'app/jobs.py', quote: "os.environ['QUEUE_URL'" }]
      }
    ]);
  });

  it('claims nothing no call ties to a variable, and leaves declared infrastructure to its own probe', async () => {
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

  it("reads only the call's own target, not a topic or queue named in the message it carries", async () => {
    expect(
      await run({
        'app/jobs/forward.rb':
          "require 'aws-sdk-sns'\nsqs.send_message(queue_url: ENV['JOBS_QUEUE_URL'], message_body: {topic_arn: ENV.fetch('EXTERNAL_TOPIC_ARN')}.to_json)\n",
        'src/forward.ts':
          "import { SendMessageCommand } from '@aws-sdk/client-sqs';\nawait sqs.send(new SendMessageCommand({ QueueUrl: process.env.JOBS_QUEUE_URL, MessageBody: JSON.stringify({ TopicArn: process.env.EXTERNAL_TOPIC_ARN }) }));\n",
        // A field outside any publish call, in a string or in a comment, is no target.
        'src/settings.ts':
          "export const settings = { TopicArn: process.env.OTHER_TOPIC_ARN };\nconst help = 'TopicArn: process.env.DOC_TOPIC_ARN';\n// sns.publish({ TopicArn: process.env.OLD_TOPIC_ARN })\n"
      })
    ).toEqual([
      {
        name: 'jobQueue',
        kind: 'queue',
        addressedBy: [],
        evidence: [{ file: 'app/jobs/forward.rb', quote: "ENV['JOBS_QUEUE_URL'" }]
      }
    ]);
  });

  const assemble = async (files: Record<string, string>) => {
    root = await mkdtemp(join(tmpdir(), 'stp-messaging-calls-'));
    const directory = root;
    await Promise.all(
      Object.entries(files).map(async ([path, contents]) => {
        await mkdir(join(directory, path, '..'), { recursive: true });
        await writeFile(join(directory, path), contents, 'utf8');
      })
    );
    const { facts } = await assembleCandidateFacts({
      root,
      probes: [manifestProbe, languageManifestProbe, serverEntrypointProbe, messagingCallsProbe]
    });
    const variables = facts.services.flatMap((service) =>
      service.environmentVariables.map(({ name, role, dependencyName }) => ({ name, role, dependencyName }))
    );
    return { facts, variables };
  };

  const twoPublishers = {
    'src/orders.ts':
      "import { PublishCommand } from '@aws-sdk/client-sns';\nexport const placed = (id: string) => sns.send(new PublishCommand({ TopicArn: process.env.ORDERS_TOPIC_ARN, Message: id }));\n",
    'src/refunds.ts':
      "import { PublishCommand } from '@aws-sdk/client-sns';\nexport const refunded = (id: string) => sns.send(new PublishCommand({ TopicArn: process.env.REFUNDS_TOPIC_ARN, Message: id }));\n"
  };

  // r2pp: with a root `@aws-sdk/client-sns`, the manifest's one topic took both variables. Review of #385: a variable
  // that named no resource of its own got the default name, which assembly folded into the other resource.
  it.each([
    [
      'a root package.json',
      {
        'package.json': JSON.stringify({
          name: 'shop',
          scripts: { start: 'node server.js' },
          dependencies: { express: '^4.0.0', '@aws-sdk/client-sns': '^3.0.0' }
        }),
        'server.js': "require('express')().listen(process.env.PORT ?? 3000);\n",
        ...twoPublishers
      },
      { ORDERS_TOPIC_ARN: 'ordersTopic', REFUNDS_TOPIC_ARN: 'refundsTopic' }
    ],
    [
      'a root Gemfile',
      railsPublisher(publish('ORDERS_TOPIC_ARN') + publish('REFUNDS_TOPIC_ARN')),
      { ORDERS_TOPIC_ARN: 'ordersTopic', REFUNDS_TOPIC_ARN: 'refundsTopic' }
    ],
    [
      'a variable that names no topic of its own',
      railsPublisher(publish('SNS_TOPIC_ARN') + publish('REFUNDS_TOPIC_ARN')),
      { REFUNDS_TOPIC_ARN: 'refundsTopic', SNS_TOPIC_ARN: 'snsTopicArn' }
    ],
    [
      "a variable that reduces to the kind's default name",
      railsPublisher(publish('NOTIFICATIONS_TOPIC_ARN') + publish('REFUNDS_TOPIC_ARN')),
      { NOTIFICATIONS_TOPIC_ARN: 'notificationsTopicArn', REFUNDS_TOPIC_ARN: 'refundsTopic' }
    ],
    [
      'queues',
      railsPublisher(send('SQS_QUEUE_URL') + send('JOB_QUEUE_URL') + send('REPORTS_QUEUE_URL')),
      { JOB_QUEUE_URL: 'jobQueueUrl', REPORTS_QUEUE_URL: 'reportsQueue', SQS_QUEUE_URL: 'sqsQueueUrl' }
    ]
  ])('each variable a call targets gets its own resource, with %s', async (_label, files, expected) => {
    const { facts, variables } = await assemble(files);

    const names = Object.values(expected).toSorted();
    expect(
      facts.dependencies
        .filter(({ kind }) => kind === 'topic' || kind === 'queue')
        .map(({ name }) => name)
        .toSorted()
    ).toEqual(names);
    expect(variables).toEqual(
      Object.entries(expected).map(([name, dependencyName]) => ({ name, role: 'infra-dependency', dependencyName }))
    );
    const { config, gaps } = composeConfig({ facts });
    expect(
      Object.entries(config.resources)
        .flatMap(([name, { type }]) => (type === 'sns-topic' || type === 'sqs-queue' ? [name] : []))
        .toSorted()
    ).toEqual(names);
    expect(gaps.filter(({ subject }) => /TOPIC|QUEUE/.test(subject))).toEqual([]);
  });

  it('an SNS or SQS client in package.json alone creates no resource, and the variables it would have taken get a gap', async () => {
    const { facts, variables } = await assemble({
      'package.json': JSON.stringify({
        name: 'shop',
        scripts: { start: 'node server.js' },
        dependencies: { express: '^4.0.0', '@aws-sdk/client-sns': '^3.0.0', '@aws-sdk/client-sqs': '^3.0.0' }
      }),
      'server.js':
        "require('express')().listen(process.env.PORT ?? 3000);\nconst topics = [process.env.ORDERS_TOPIC_ARN, process.env.REFUNDS_TOPIC_ARN];\nconst queue = process.env.JOBS_QUEUE_URL;\n// An IoT topic, not SNS: only an ARN or a queue URL is surely SNS or SQS.\nconst channel = process.env.REALTIME_TOPIC;\n"
    });

    expect(facts.dependencies.filter(({ kind }) => kind === 'topic' || kind === 'queue')).toEqual([]);
    expect(variables.map(({ role }) => role)).toEqual([
      'runtime-config',
      'runtime-config',
      'runtime-config',
      'runtime-config'
    ]);
    const { gaps, unsetSettings } = composeConfig({ facts });
    expect(unsetSettings.map(({ variableName }) => variableName)).toEqual(['REALTIME_TOPIC']);
    expect(gaps.filter(({ subject }) => /TOPIC|QUEUE/.test(subject))).toEqual([
      expect.objectContaining({
        subject: 'shop.JOBS_QUEUE_URL',
        message: expect.stringContaining(
          "add an sqs-queue, list it in connectTo on shop and set JOBS_QUEUE_URL to $ResourceParam('<queue name>', 'url')"
        )
      }),
      {
        subject: 'shop.ORDERS_TOPIC_ARN',
        message:
          "ORDERS_TOPIC_ARN names an SNS topic, but no publish call in the code takes its target from it, so init created none. If the app owns it, add an sns-topic, list it in connectTo on shop and set ORDERS_TOPIC_ARN to $ResourceParam('<topic name>', 'arn'). If it belongs to another project, set ORDERS_TOPIC_ARN to its address. Do this before deploying."
      },
      expect.objectContaining({ subject: 'shop.REFUNDS_TOPIC_ARN' })
    ]);
  });
});
