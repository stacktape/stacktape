import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { getAwsSynchronizedTime } from '@utils/time';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { ExpectedError } from '@utils/errors';
import {
  acquireStackLock,
  STACK_LOCK_LEASE_MS,
  STACK_LOCK_RENEW_INTERVAL_MS,
  STACK_LOCK_S3_KEY,
  StackLockLostError,
  waitForStackLock,
  type HeldStackLock,
  type StackLockedError,
  type StackLockStore
} from './lock';

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
  }
});

export type StackLockOperation = 'deploy' | 'rollback' | 'delete';

let heldLock: HeldStackLock | undefined;
/** Set when a later step, such as a code swap, settles the operation at exit and releases the lock only then. */
let releasedOnlyAtExit = false;

/** Releases the lock this command holds, if any. For a step that needs the bucket empty before the command ends. */
export const releaseHeldStackLock = async () => {
  await heldLock?.release();
};

/**
 * Stops using the lock without touching it. For a command that took the lock of a stack that turns out to be going away:
 * it continues as on a new stack, which takes the lock again when it needs it.
 */
export const abandonHeldStackLock = () => {
  heldLock?.detach();
  heldLock = undefined;
  releasedOnlyAtExit = false;
};

/** A previous holder that released the lock this recently may have changed the stack after the command read it. */
const RECENT_RELEASE_MS = 30_000;

/** Times stay the same while the command waits, so a CI log shows each message once. */
const utcTime = (ms: number) => `${new Date(ms).toISOString().slice(11, 19)} UTC`;

const describeWait = ({ holder }: StackLockedError, nowMs: number) => {
  const operation = holder.operation === 'unknown' ? 'operation' : holder.operation;
  // A running holder renews every 30 seconds, so twice that without a renewal means it stopped.
  if (nowMs - holder.renewedAtMs > 2 * STACK_LOCK_RENEW_INTERVAL_MS) {
    return `The ${operation} that holds this stack's lock (invocation ${holder.invocationId}) stopped without releasing it, probably because it was killed. Its lock expires at ${utcTime(holder.renewedAtMs + STACK_LOCK_LEASE_MS)}.`;
  }
  const since = holder.startedAtMs === undefined ? '' : `, started at ${utcTime(holder.startedAtMs)}`;
  return `Waiting for another ${operation} of this stack to finish (invocation ${holder.invocationId}${since}).`;
};

/**
 * Takes the stack's lock until the command ends, waiting while another operation holds it. Deploy, rollback and delete
 * take it when they start, before they read the stack, so each plans against what the previous operation left.
 *
 * A code-swap stack's operation settles the swap at exit and releases the lock only then, so it passes
 * `releaseOnExit: false`. Every step after the first shares the lock. Its `release` frees the lock unless such a step
 * asked to keep it until exit.
 */
export const holdStackLock = async ({
  bucketName,
  operation,
  releaseOnExit = true,
  onWaiting
}: {
  bucketName: string;
  operation: StackLockOperation;
  releaseOnExit?: boolean;
  /** Shows why the command waits. By default it is printed once for each operation it waits for. */
  onWaiting?: (message: string) => void;
}): Promise<HeldStackLock & { stackMayHaveChanged: boolean }> => {
  const current = heldLock;
  if (current?.isHeld()) {
    if (!releaseOnExit) releasedOnlyAtExit = true;
    return {
      ...current,
      stackMayHaveChanged: false,
      release: async () => {
        if (!releasedOnlyAtExit) await current.release();
      }
    };
  }
  const clockSkewMs = (await getAwsSynchronizedTime()).getTime() - Date.now();
  const now = () => Date.now() + clockSkewMs;
  const announced = new Set<string>();
  const { lock, waited } = await waitForStackLock({
    acquire: () =>
      acquireStackLock({
        store: s3Store(bucketName),
        invocationId: globalStateManager.invocationId,
        operation,
        now,
        onLost: () =>
          tuiManager.warn(
            'Another operation took over this stack, because this one could not renew its lock. Check the result of both.'
          )
      }),
    onWaiting: (busy) => {
      const message = describeWait(busy, now());
      if (onWaiting) return onWaiting(message);
      if (announced.has(message)) return;
      announced.add(message);
      tuiManager.info(message);
    }
  });
  // Last at exit: a code swap settles before it, and may leave the lock to expire instead.
  if (releaseOnExit) applicationManager.finalCleanUpHooks.push(() => lock.release());
  releasedOnlyAtExit = !releaseOnExit;
  heldLock = {
    ...lock,
    confirm: async () => {
      try {
        await lock.confirm();
      } catch (error) {
        if (!(error instanceof StackLockLostError)) throw error;
        throw new ExpectedError('STACK', error.message, [
          'This operation stopped here, so it does not overwrite what the other one did. Check the result of the other operation.'
        ]);
      }
    }
  };
  const releasedRecently =
    lock.previousReleaseAtMs !== undefined && now() - lock.previousReleaseAtMs < RECENT_RELEASE_MS;
  return { ...heldLock, stackMayHaveChanged: waited || releasedRecently };
};

/**
 * The first step of a command that holds the lock from its start: deploy, rollback and delete. A stack whose deployment
 * bucket does not exist has nowhere to keep the lock; a deploy that creates the bucket takes the lock before its upload.
 */
export const takeStackLockAtStart = (operation: StackLockOperation) => async (onWaiting: (message: string) => void) => {
  const bucketName = awsResourceNames.deploymentBucket(globalStateManager.targetStack.globallyUniqueStackHash);
  if (!(await awsSdkManager.s3.bucketExists({ bucketName }))) return undefined;
  const { stackMayHaveChanged } = await holdStackLock({ bucketName, operation, onWaiting });
  return { stackMayHaveChanged, abandon: abandonHeldStackLock };
};
