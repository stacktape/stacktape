import { expect, test } from 'bun:test';
import { getBrowserRecordingS3ObjectArn } from './index';

// The AgentCore family scenario covers the stack-bucket (directive) form; a literal bucket name is the other path a
// customer takes when recordings go to a bucket outside the stack.
test('builds browser recording object ARN from a literal bucket name', () => {
  expect(getBrowserRecordingS3ObjectArn({ bucketName: 'recordings-bucket', prefix: 'sessions/' })).toBe(
    'arn:aws:s3:::recordings-bucket/sessions/*'
  );
});
