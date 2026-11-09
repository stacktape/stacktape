import { afterEach, beforeAll, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { ExpectedError } from '@utils/errors';
import { STACK_LOCK_LEASE_MS } from './lock';

// The lock reads AWS's clock over HTTPS; these tests use the local one.
mock.module('@utils/time', () => ({ getAwsSynchronizedTime: async () => new Date() }));

let lockModule: typeof import('./index');
beforeAll(async () => {
  lockModule = await import('./index');
});

/** The lock object in an in-memory deployment bucket. */
let object: { etag: string; body: string } | undefined;
let revision = 0;
const write = (body: string) => {
  revision += 1;
  object = { etag: `etag-${revision}`, body };
  return object.etag;
};
const spies: { mockRestore: () => void }[] = [];

beforeEach(() => {
  awsSdkManager.init({ credentials: { accessKeyId: 'test', secretAccessKey: 'test' }, region: 'eu-west-1' });
  object = undefined;
  applicationManager.cleanUpHooks.length = 0;
  applicationManager.finalCleanUpHooks.length = 0;
  delete process.env.STP_STACK_LOCK_HOLDERS;
  spies.push(
    spyOn(awsSdkManager.s3, 'putObjectConditionally').mockImplementation(async ({ body, condition }) => {
      if ('ifNoneMatch' in condition) return object ? undefined : write(body);
      return object?.etag === condition.ifMatch ? write(body) : undefined;
    }),
    spyOn(awsSdkManager.s3, 'getObjectIfExists').mockImplementation(async () => object)
  );
});
afterEach(() => {
  lockModule.abandonHeldStackLock();
  spies.splice(0).forEach((spy) => spy.mockRestore());
  delete process.env.STP_STACK_LOCK_HOLDERS;
});

const holder = (invocationId: string, renewedAtMs: number) =>
  JSON.stringify({ invocationId, operation: 'deploy', renewedAtMs, startedAtMs: renewedAtMs });

/** What the command does when it ends: ordinary cleanup hooks first, then the final ones in order. */
const exitCommand = async (success: boolean) => {
  await Promise.all(applicationManager.cleanUpHooks.map((hook) => hook({ success, interrupted: false })));
  for (const hook of applicationManager.finalCleanUpHooks) await hook();
};

describe('the stack lock of a command', () => {
  test('a command started from a hook of the operation holding the lock fails instead of waiting for its parent', async () => {
    write(holder('parent-deploy', Date.now()));
    // A deploy of this stack ran a hook that deployed another stack, whose hook runs this command.
    process.env.STP_STACK_LOCK_HOLDERS = 'parent-deploy,other-stack-deploy';
    const failure = await lockModule
      .holdStackLock({ bucketName: 'bucket', operation: 'rollback', onWaiting: () => {} })
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ExpectedError);
    expect((failure as Error).message).toContain('runs from a hook of the deploy that holds this stack');
    expect(JSON.parse(object!.body).invocationId).toBe('parent-deploy');
  });

  test('tells the commands it starts which invocation holds the lock', async () => {
    await lockModule.holdStackLock({ bucketName: 'bucket', operation: 'deploy' });
    expect(process.env.STP_STACK_LOCK_HOLDERS).toBe(globalStateManager.invocationId);
  });

  test('passes on the lock holders among its ancestors as well', async () => {
    process.env.STP_STACK_LOCK_HOLDERS = 'grandparent';
    await lockModule.holdStackLock({ bucketName: 'bucket', operation: 'deploy' });
    expect(process.env.STP_STACK_LOCK_HOLDERS).toBe(`grandparent,${globalStateManager.invocationId}`);
  });

  test('a command that took over a stopped operation and failed leaves the lock to expire, for the next one to repair', async () => {
    write(holder('killed', Date.now() - STACK_LOCK_LEASE_MS - 1000));
    const lock = await lockModule.holdStackLock({ bucketName: 'bucket', operation: 'deploy' });
    expect(lock.tookOverFrom?.invocationId).toBe('killed');
    await exitCommand(false);
    expect(JSON.parse(object!.body).invocationId).toBe(globalStateManager.invocationId);
  });

  test('a command that took over a stopped operation and succeeded releases the lock', async () => {
    write(holder('killed', Date.now() - STACK_LOCK_LEASE_MS - 1000));
    await lockModule.holdStackLock({ bucketName: 'bucket', operation: 'deploy' });
    await exitCommand(true);
    expect(JSON.parse(object!.body)).toMatchObject({ released: true });
  });

  test('a failed command that took a free lock releases it', async () => {
    await lockModule.holdStackLock({ bucketName: 'bucket', operation: 'deploy' });
    await exitCommand(false);
    expect(JSON.parse(object!.body)).toMatchObject({ released: true });
  });

  test('a step that settles at exit keeps the shared lock until then', async () => {
    await lockModule.holdStackLock({ bucketName: 'bucket', operation: 'deploy' });
    const codeSwap = await lockModule.holdStackLock({
      bucketName: 'bucket',
      operation: 'deploy',
      releaseOnExit: false
    });
    const deployStep = await lockModule.holdStackLock({ bucketName: 'bucket', operation: 'deploy' });
    await deployStep.release();
    await codeSwap.release();
    expect(JSON.parse(object!.body).invocationId).toBe(globalStateManager.invocationId);
    await exitCommand(true);
    expect(JSON.parse(object!.body)).toMatchObject({ released: true });
  });
});
