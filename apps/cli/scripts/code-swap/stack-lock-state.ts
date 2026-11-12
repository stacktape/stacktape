import { GetObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import {
  parseStackLockHolder,
  STACK_LOCK_LEASE_MS,
  STACK_LOCK_S3_KEY
} from '../../src/domain/stack-operation-lock/lock';

/** Who holds the stack's lock. A released or missing lock has no holder. */
export const readStackLockHolder = async (s3: S3Client, bucket: string) => {
  try {
    const { Body } = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: STACK_LOCK_S3_KEY }));
    return parseStackLockHolder(await Body!.transformToString());
  } catch (error) {
    if (error instanceof Error && ['NoSuchKey', 'NoSuchBucket'].includes(error.name)) return undefined;
    throw error;
  }
};

/** The next operation takes the lock of a stopped one over once this has passed. */
export const waitForStackLockLease = () => Bun.sleep(STACK_LOCK_LEASE_MS + 5000);
