/**
 * Tries one write and one read against every target and reports `allowed`, `denied` or the unexpected error name, plus
 * the `STP_*` variable names it received and a hash of the secret, never the value.
 */
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { createHash } from 'node:crypto';

const dynamo = new DynamoDBClient({});
const s3 = new S3Client({});
const sqs = new SQSClient({});

const attempt = async (operation: () => Promise<unknown>) => {
  try {
    await operation();
    return 'allowed';
  } catch (error) {
    const { name = 'Error', message = '' } = error as { name?: string; message?: string };
    return /AccessDenied|not authorized/i.test(`${name} ${message}`) ? 'denied' : `error:${name}`;
  }
};

const table = (name: string) =>
  attempt(async () => {
    await dynamo.send(new PutItemCommand({ TableName: name, Item: { id: { S: 'probe' } } }));
    await dynamo.send(new GetItemCommand({ TableName: name, Key: { id: { S: 'probe' } } }));
  });
const bucket = (name: string) =>
  attempt(async () => {
    await s3.send(new PutObjectCommand({ Bucket: name, Key: 'probe.txt', Body: 'probe' }));
    await (await s3.send(new GetObjectCommand({ Bucket: name, Key: 'probe.txt' }))).Body?.transformToString();
  });
const queue = (url: string) => attempt(() => sqs.send(new SendMessageCommand({ QueueUrl: url, MessageBody: 'probe' })));

export const handler = async (event: { rawPath?: string }) => {
  const env = process.env;
  const access = {
    tableA: await table(env.TABLE_A!),
    tableB: await table(env.TABLE_B!),
    bucketA: await bucket(env.BUCKET_A!),
    bucketB: await bucket(env.BUCKET_B!),
    queueA: await queue(env.QUEUE_A_URL!)
  };
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      path: event.rawPath ?? null,
      variant: env.CANARY_VARIANT ?? null,
      access,
      stpVariables: Object.keys(env)
        .filter((name) => name.startsWith('STP_'))
        .sort(),
      secretSha256: env.CANARY_SECRET ? createHash('sha256').update(env.CANARY_SECRET).digest('hex') : null
    })
  };
};
