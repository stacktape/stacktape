/**
 * Stores every request in the connected bucket and answers it. For the stack's service Lambda, pointed here as its
 * Console API, it answers like the Console's tRPC endpoint.
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomBytes } from 'node:crypto';

const s3 = new S3Client({});
const bucket = process.env.REQUESTS_BUCKET;

type FunctionUrlEvent = {
  rawPath: string;
  headers?: Record<string, string>;
  body?: string;
  isBase64Encoded?: boolean;
};

export default async (event: FunctionUrlEvent) => {
  const body = event.body && event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  const headers = event.headers || {};
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: `requests/${Date.now()}-${randomBytes(4).toString('hex')}.json`,
      ContentType: 'application/json',
      Body: JSON.stringify({
        path: event.rawPath,
        headers: {
          'content-type': headers['content-type'],
          'x-stacktape-signature': headers['x-stacktape-signature'],
          'x-canary-key': headers['x-canary-key'],
          'has-aws-identity': Boolean(headers.aws_identity)
        },
        body
      })
    })
  );
  if (event.rawPath.endsWith('/reportAlarmEvent')) {
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: '[{"result":{"data":"canary"}}]' };
  }
  return { statusCode: 200, body: 'ok' };
};
