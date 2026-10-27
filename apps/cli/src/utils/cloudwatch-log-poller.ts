/**
 * Polls CloudWatch log groups for one process within a request budget. `FilterLogEvents` allows about 10 requests per
 * second per account and region in most regions, shared by every session and tool of that account. Polling each
 * function every 500 ms exceeded it with five functions, or with a few `stacktape dev` sessions: logs arrived up to
 * half a minute late and every throttled request printed an error.
 *
 * Here one loop serves every log group of the process. A group that just had events is polled about every second; a
 * quiet group less often, up to `idleIntervalMs`. Requests never exceed `maxRequestsPerSecond`. When CloudWatch
 * throttles, the rate halves and recovers slowly, and `onThrottled` hears of it; the caller reports it once.
 *
 * CloudWatch Logs Live Tail would stream instead of polling, but it is billed per session minute ($0.01 after 1,800 free
 * minutes a month), which a dev session left running all day would turn into a real cost.
 */

/** Polls once and returns how many new events it found. */
type PollFn = () => Promise<number>;

type Target = { poll: PollFn; nextPollAt: number; intervalMs: number; failures: number };

export const isThrottlingError = (error: unknown): boolean => {
  for (let current = error, depth = 0; current && depth < 5; depth++) {
    const { name, message, cause } = current as { name?: unknown; message?: unknown; cause?: unknown };
    if (
      typeof name === 'string' &&
      ['ThrottlingException', 'TooManyRequestsException', 'RequestLimitExceeded', 'LimitExceededException'].includes(
        name
      )
    ) {
      return true;
    }
    if (typeof message === 'string' && /rate exceeded|throttl/i.test(message)) return true;
    current = cause;
  }
  return false;
};

export const createLogPollScheduler = ({
  maxRequestsPerSecond = 2,
  minRequestsPerSecond = 0.2,
  activeIntervalMs = 1000,
  idleIntervalMs = 2000,
  onThrottled,
  onError,
  now = () => Date.now(),
  sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  random = Math.random
}: {
  maxRequestsPerSecond?: number;
  minRequestsPerSecond?: number;
  activeIntervalMs?: number;
  idleIntervalMs?: number;
  onThrottled?: (error: unknown) => void;
  onError?: (id: string, error: unknown) => void;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
} = {}) => {
  const targets = new Map<string, Target>();
  let rate = maxRequestsPerSecond;
  let nextRequestAt = 0;
  let successesSinceThrottle = 0;
  let running = false;
  /** Each loop runs only while it is the latest one, so stopping and registering again never runs two. */
  let generation = 0;
  let wake: (() => void) | undefined;

  const jitter = (ms: number) => ms * (0.8 + random() * 0.4);

  const loop = async (loopGeneration: number) => {
    for (;;) {
      if (!running || loopGeneration !== generation) return;
      const [id, target] = [...targets].sort(([, a], [, b]) => a.nextPollAt - b.nextPollAt)[0] ?? [];
      const waitMs = target ? Math.max(target.nextPollAt, nextRequestAt) - now() : idleIntervalMs;
      if (waitMs > 0) {
        // A registration or a boost may make another poll due sooner.
        await Promise.race([sleep(waitMs), new Promise<void>((resolve) => (wake = resolve))]);
        wake = undefined;
        continue;
      }
      if (!id || !target) continue;
      nextRequestAt = now() + 1000 / rate;
      try {
        const found = await target.poll();
        target.failures = 0;
        target.intervalMs = found > 0 ? activeIntervalMs : Math.min(idleIntervalMs, target.intervalMs * 1.5);
        if (++successesSinceThrottle >= 5 && rate < maxRequestsPerSecond) {
          rate = Math.min(maxRequestsPerSecond, rate + 0.25);
          successesSinceThrottle = 0;
        }
      } catch (error) {
        target.failures++;
        if (isThrottlingError(error)) {
          rate = Math.max(minRequestsPerSecond, rate / 2);
          successesSinceThrottle = 0;
          onThrottled?.(error);
        } else {
          onError?.(id, error);
        }
        target.intervalMs = Math.min(idleIntervalMs * 6, idleIntervalMs * 2 ** Math.min(target.failures - 1, 3));
      }
      if (targets.get(id) === target) target.nextPollAt = now() + jitter(target.intervalMs);
    }
  };

  return {
    /** Starts polling `poll` under `id`; a new registration under the same `id` replaces the old one. */
    register: (id: string, poll: PollFn) => {
      targets.set(id, { poll, nextPollAt: now(), intervalMs: activeIntervalMs, failures: 0 });
      if (!running) {
        running = true;
        void loop(++generation);
      }
      wake?.();
      return {
        /** Polls this group soon and often again, for example after its function was redeployed or invoked. */
        boost: () => {
          const target = targets.get(id);
          if (!target) return;
          target.intervalMs = activeIntervalMs;
          target.nextPollAt = Math.min(target.nextPollAt, now());
          wake?.();
        },
        unregister: () => {
          targets.delete(id);
          if (!targets.size) {
            running = false;
            wake?.();
          }
        }
      };
    },
    /** The current request budget, after throttling lowered it. */
    get requestsPerSecond() {
      return rate;
    },
    stop: () => {
      targets.clear();
      running = false;
      wake?.();
    }
  };
};

export type LogPollScheduler = ReturnType<typeof createLogPollScheduler>;
