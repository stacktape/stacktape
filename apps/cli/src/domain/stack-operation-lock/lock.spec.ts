import { describe, expect, test } from 'bun:test';
import {
  acquireStackLock,
  STACK_LOCK_LEASE_MS,
  StackLockedError,
  StackLockLostError,
  type StackLockStore
} from './lock';

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
    replace: async (body, etag) => (object?.etag === etag ? write(body) : 'conflict')
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
    const { store } = memoryStore();
    const first = await acquireStackLock(options(store, 'a', () => 1000));
    await expect(acquireStackLock(options(store, 'b', () => 2000))).rejects.toBeInstanceOf(StackLockedError);
    await first.release();
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

  test('an operation that paused past its lease cannot continue, and cannot free the new holder', async () => {
    const { store, current } = memoryStore();
    let time = 0;
    const paused = await acquireStackLock(options(store, 'paused', () => time));
    time = STACK_LOCK_LEASE_MS + 1;
    await acquireStackLock(options(store, 'next', () => time));

    await expect(paused.confirm()).rejects.toBeInstanceOf(StackLockLostError);
    await paused.release();
    expect(JSON.parse(current()!.body).invocationId).toBe('next');
    await expect(acquireStackLock(options(store, 'third', () => time))).rejects.toBeInstanceOf(StackLockedError);
  });

  test('a release that races a takeover does not free the new holder', async () => {
    const { store, current } = memoryStore();
    let time = 0;
    const slow = await acquireStackLock(options(store, 'slow', () => time));
    time = STACK_LOCK_LEASE_MS + 1;
    await acquireStackLock(options(store, 'next', () => time));
    await slow.release();
    expect(JSON.parse(current()!.body).invocationId).toBe('next');
  });

  test('confirm renews the lock', async () => {
    const { store } = memoryStore();
    let time = 0;
    const held = await acquireStackLock(options(store, 'a', () => time));
    time = STACK_LOCK_LEASE_MS - 1;
    await held.confirm();
    time = STACK_LOCK_LEASE_MS + 10;
    await expect(acquireStackLock(options(store, 'b', () => time))).rejects.toBeInstanceOf(StackLockedError);
  });

  test('detach leaves the lock in place and stops renewing it', async () => {
    const { store, current } = memoryStore();
    const held = await acquireStackLock(options(store, 'deleting', () => 0));
    const before = current();
    held.detach();
    await held.release();
    expect(current()).toEqual(before);
    expect(held.isHeld()).toBe(false);
  });

  test('a lock that was released or deleted can be taken again', async () => {
    const { store, current } = memoryStore();
    const held = await acquireStackLock(options(store, 'a', () => 0));
    await held.release();
    await acquireStackLock(options(store, 'b', () => 1));
    expect(JSON.parse(current()!.body).invocationId).toBe('b');
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
