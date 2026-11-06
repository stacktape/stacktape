import { describe, expect, test } from 'bun:test';
import { acquireStackLock, STACK_LOCK_LEASE_MS, StackLockedError, type StackLockStore } from './lock';

const memoryStore = () => {
  let object: { etag: string; body: string } | undefined;
  let revision = 0;
  const write = (body: string) => {
    revision += 1;
    object = { etag: `etag-${revision}`, body };
    return { etag: object.etag };
  };
  const store: StackLockStore = {
    create: async (body) => (object ? 'conflict' : write(body)),
    read: async () => object,
    replace: async (body, etag) => (object?.etag === etag ? write(body) : 'conflict'),
    remove: async () => {
      object = undefined;
    }
  };
  return { store, current: () => object };
};

const options = (store: StackLockStore, invocationId: string, now: () => number) => ({
  store,
  invocationId,
  operation: 'deploy',
  now,
  setRenewTimer: () => () => {}
});

describe('stack operation lock', () => {
  test('lets only one operation hold it, and frees it on release', async () => {
    const { store, current } = memoryStore();
    const first = await acquireStackLock(options(store, 'a', () => 1000));
    await expect(acquireStackLock(options(store, 'b', () => 2000))).rejects.toBeInstanceOf(StackLockedError);
    await first.release();
    expect(current()).toBeUndefined();
    await expect(acquireStackLock(options(store, 'b', () => 3000))).resolves.toBeDefined();
  });

  test('names the holder and when its lock expires', async () => {
    const { store } = memoryStore();
    await acquireStackLock(options(store, 'a', () => 1000));
    const error = await acquireStackLock(options(store, 'b', () => 21_000)).catch((caught) => caught);
    expect(error).toBeInstanceOf(StackLockedError);
    expect(error.message).toContain('a');
    expect(error.retryAfterMs).toBe(STACK_LOCK_LEASE_MS - 20_000);
  });

  test('takes over the lock of a killed operation after the lease', async () => {
    const { store, current } = memoryStore();
    await acquireStackLock(options(store, 'killed', () => 0));
    await acquireStackLock(options(store, 'next', () => STACK_LOCK_LEASE_MS + 1));
    expect(JSON.parse(current()!.body).invocationId).toBe('next');
  });

  test('takes over a lock it cannot read', async () => {
    const { store, current } = memoryStore();
    await store.create('not json');
    await acquireStackLock(options(store, 'next', () => 0));
    expect(JSON.parse(current()!.body).invocationId).toBe('next');
  });

  test('lets the same invocation take its lock again', async () => {
    const { store } = memoryStore();
    await acquireStackLock(options(store, 'a', () => 0));
    await expect(acquireStackLock(options(store, 'a', () => 1))).resolves.toBeDefined();
  });

  test('renewing keeps the lock, so the next operation still sees it held', async () => {
    const { store } = memoryStore();
    let time = 0;
    let renew = () => {};
    const held = await acquireStackLock({
      ...options(store, 'a', () => time),
      setRenewTimer: (callback) => {
        renew = callback;
        return () => {};
      }
    });
    time = STACK_LOCK_LEASE_MS - 1;
    renew();
    await Bun.sleep(0);
    time = STACK_LOCK_LEASE_MS + 10;
    await expect(acquireStackLock(options(store, 'b', () => time))).rejects.toBeInstanceOf(StackLockedError);
    expect(held.isHeld()).toBe(true);
  });

  test('reports a takeover, and does not remove the new holder on release', async () => {
    const { store, current } = memoryStore();
    let time = 0;
    let renew = () => {};
    let lost = false;
    const held = await acquireStackLock({
      ...options(store, 'slow', () => time),
      setRenewTimer: (callback) => {
        renew = callback;
        return () => {};
      },
      onLost: () => {
        lost = true;
      }
    });
    time = STACK_LOCK_LEASE_MS + 1;
    await acquireStackLock(options(store, 'next', () => time));
    renew();
    await Bun.sleep(0);
    expect(lost).toBe(true);
    expect(held.isHeld()).toBe(false);
    await held.release();
    expect(JSON.parse(current()!.body).invocationId).toBe('next');
  });

  test('keeps going through a failed renewal', async () => {
    const { store } = memoryStore();
    let renew = () => {};
    let lost = false;
    const held = await acquireStackLock({
      ...options(
        {
          ...store,
          replace: async () => {
            throw new Error('network');
          }
        },
        'a',
        () => 0
      ),
      setRenewTimer: (callback) => {
        renew = callback;
        return () => {};
      },
      onLost: () => {
        lost = true;
      }
    });
    renew();
    await Bun.sleep(0);
    expect(lost).toBe(false);
    expect(held.isHeld()).toBe(true);
  });
});
