import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { getAwsSynchronizedTime } from '@utils/time';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { ExpectedError } from '@utils/errors';
import { acquireStackLock, STACK_LOCK_S3_KEY, StackLockedError, type HeldStackLock, type StackLockStore } from './lock';

const s3Store = (bucketName: string): StackLockStore => ({
  create: async (body) => {
    const etag = await awsSdkManager.s3.putObjectConditionally({
      bucketName,
      s3Key: STACK_LOCK_S3_KEY,
      body,
      condition: { ifNoneMatch: '*' }
    });
    return etag === undefined ? 'conflict' : { etag };
  },
  read: () => awsSdkManager.s3.getObjectIfExists({ bucketName, s3Key: STACK_LOCK_S3_KEY }),
  replace: async (body, currentEtag) => {
    const etag = await awsSdkManager.s3.putObjectConditionally({
      bucketName,
      s3Key: STACK_LOCK_S3_KEY,
      body,
      condition: { ifMatch: currentEtag }
    });
    return etag === undefined ? 'conflict' : { etag };
  },
  remove: async () => {
    await awsSdkManager.s3.deleteObjects(bucketName, [{ Key: STACK_LOCK_S3_KEY }]);
  }
});

/**
 * Takes the stack's lock until the returned function runs or the command ends. A held lock fails the command: running
 * next to another operation is never what a user wants, and CI should report it.
 */
export const holdStackLock = async ({
  bucketName,
  operation
}: {
  bucketName: string;
  operation: 'deploy' | 'rollback' | 'delete';
}): Promise<HeldStackLock> => {
  const clockSkewMs = (await getAwsSynchronizedTime()).getTime() - Date.now();
  let lock: HeldStackLock;
  try {
    lock = await acquireStackLock({
      store: s3Store(bucketName),
      invocationId: globalStateManager.invocationId,
      operation,
      now: () => Date.now() + clockSkewMs,
      onLost: () =>
        tuiManager.warn(
          'Another operation took over this stack, because this one could not renew its lock. Check the result of both.'
        )
    });
  } catch (error) {
    if (!(error instanceof StackLockedError)) throw error;
    throw new ExpectedError('STACK', error.message, [
      'Wait for it to finish and run this command again.',
      `If it was killed, its lock expires in ${Math.ceil(error.retryAfterMs / 1000)} seconds.`
    ]);
  }
  applicationManager.registerCleanUpHook(() => lock.release());
  return lock;
};
