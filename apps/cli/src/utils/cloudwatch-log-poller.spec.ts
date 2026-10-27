import { expect, test } from 'bun:test';
import { createLogPollScheduler, isThrottlingError } from './cloudwatch-log-poller';

/** Runs the scheduler on a virtual clock: every sleep advances it and yields to the event loop once. */
const virtualClock = () => {
  let time = 0;
  return {
    now: () => time,
    sleep: (ms: number) => {
      time += ms;
      return new Promise<void>((resolve) => setImmediate(resolve));
    },
    runUntil: async (ms: number) => {
      for (;;) {
        if (time >= ms) return;
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }
  };
};

const throttled = () => Object.assign(new Error('Rate exceeded'), { name: 'ThrottlingException' });

test('ten quiet log groups stay within the request budget and are each read every few seconds', async () => {
  const clock = virtualClock();
  const scheduler = createLogPollScheduler({ now: clock.now, sleep: clock.sleep, random: () => 0.5 });
  const calls: Array<{ id: string; at: number }> = [];
  for (let index = 0; index < 10; index++) {
    const id = `fn${index}`;
    scheduler.register(id, async () => {
      calls.push({ id, at: clock.now() });
      return 0;
    });
  }
  await clock.runUntil(60_000);
  scheduler.stop();

  // The old printer made 2 requests per second per function: 1,200 in this minute.
  expect(calls.length).toBeLessThanOrEqual(2 * 60 + 2);
  for (let second = 0; second < 60; second++) {
    expect(calls.filter(({ at }) => at >= second * 1000 && at < (second + 1) * 1000).length).toBeLessThanOrEqual(2);
  }
  for (let index = 0; index < 10; index++) {
    const times = calls.filter(({ id }) => id === `fn${index}`).map(({ at }) => at);
    const gaps = times.slice(1).map((at, i) => at - times[i]);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(7000);
  }
});

test('a log group with new events is read about every second', async () => {
  const clock = virtualClock();
  const scheduler = createLogPollScheduler({ now: clock.now, sleep: clock.sleep, random: () => 0.5 });
  const active: number[] = [];
  scheduler.register('busy', async () => {
    active.push(clock.now());
    return 3;
  });
  scheduler.register('quiet', async () => 0);
  await clock.runUntil(20_000);
  scheduler.stop();
  expect(active.length).toBeGreaterThanOrEqual(15);
});

test('throttling halves the request rate, is reported each time, and the rate recovers', async () => {
  const clock = virtualClock();
  const reports: unknown[] = [];
  const scheduler = createLogPollScheduler({
    now: clock.now,
    sleep: clock.sleep,
    random: () => 0.5,
    onThrottled: (error) => reports.push(error),
    onError: () => {
      throw new Error('throttling is not an error');
    }
  });
  let calls = 0;
  scheduler.register('fn', async () => {
    calls++;
    if (calls <= 3) throw throttled();
    return 1;
  });
  // Each throttled read of the group also waits longer: 2, 4 and 8 s.
  await clock.runUntil(40_000);
  expect(reports.length).toBe(3);
  expect(scheduler.requestsPerSecond).toBeLessThan(2);
  await clock.runUntil(300_000);
  scheduler.stop();
  expect(scheduler.requestsPerSecond).toBe(2);
});

test('a boost reads a quiet log group at once; an unregistered one is not read again', async () => {
  const clock = virtualClock();
  const scheduler = createLogPollScheduler({ now: clock.now, sleep: clock.sleep, random: () => 0.5 });
  const reads: number[] = [];
  const poll = scheduler.register('fn', async () => {
    reads.push(clock.now());
    return 0;
  });
  await clock.runUntil(30_000);
  const before = reads.length;
  const boostedAt = clock.now();
  poll.boost();
  await clock.runUntil(boostedAt + 1000);
  expect(reads.length).toBe(before + 1);
  expect(reads.at(-1)! - boostedAt).toBeLessThanOrEqual(1000);
  poll.unregister();
  const afterUnregister = reads.length;
  // Another group keeps the clock running.
  scheduler.register('other', async () => 0);
  await clock.runUntil(60_000);
  scheduler.stop();
  expect(reads.length).toBe(afterUnregister);
});

test('a read with more pages continues at the request rate and leaves room for the other groups', async () => {
  const clock = virtualClock();
  const scheduler = createLogPollScheduler({ now: clock.now, sleep: clock.sleep, random: () => 0.5 });
  const calls: Array<{ id: string; at: number }> = [];
  let pages = 20;
  scheduler.register('backlog', async () => {
    calls.push({ id: 'backlog', at: clock.now() });
    return { found: 0, more: --pages > 0 };
  });
  scheduler.register('other', async () => {
    calls.push({ id: 'other', at: clock.now() });
    return 0;
  });
  await clock.runUntil(15_000);
  scheduler.stop();

  const backlog = calls.filter(({ id }) => id === 'backlog').map(({ at }) => at);
  // All 20 pages within about 10 s at 2 requests a second, instead of one page every second or two.
  expect(backlog.length).toBeGreaterThanOrEqual(20);
  expect(backlog[19]).toBeLessThanOrEqual(12_000);
  for (let second = 0; second < 15; second++) {
    expect(calls.filter(({ at }) => at >= second * 1000 && at < (second + 1) * 1000).length).toBeLessThanOrEqual(2);
  }
  expect(calls.filter(({ id, at }) => id === 'other' && at < 10_000).length).toBeGreaterThanOrEqual(3);
});

test.each([
  [throttled(), true],
  [new Error('Rate exceeded'), true],
  [new Error('Failed to get log events.', { cause: throttled() }), true],
  [Object.assign(new Error('x'), { name: 'TooManyRequestsException' }), true],
  [Object.assign(new Error('User is not authorized'), { name: 'AccessDeniedException' }), false],
  ['Rate exceeded', false]
])('isThrottlingError(%p) is %p', (error, expected) => {
  expect(isThrottlingError(error)).toBe(expected);
});
