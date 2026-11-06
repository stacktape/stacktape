/**
 * One operation at a time on a stack. CloudFormation allows one update, but a fast deployment does not go through it, so
 * two CI jobs, or a rollback during a fast deployment, could otherwise replace each other's rollout.
 *
 * The lock is an object in the deployment bucket. Conditional writes make taking it atomic. The holder renews it while
 * it runs, so the lock of a killed CI job expires and the next operation takes it over.
 */

export const STACK_LOCK_S3_KEY = 'stack-operation-lock.json';
/** A killed operation blocks the next one for at most this long. */
export const STACK_LOCK_LEASE_MS = 120_000;
export const STACK_LOCK_RENEW_INTERVAL_MS = 30_000;

export type StackLockHolder = {
  invocationId: string;
  operation: string;
  /** When the holder last renewed the lock. */
  renewedAtMs: number;
};

/** The S3 calls the lock needs. A condition that does not hold returns `conflict` and doesn't throw. */
export type StackLockStore = {
  create: (body: string) => Promise<{ etag: string } | 'conflict'>;
  read: () => Promise<{ etag: string; body: string } | undefined>;
  replace: (body: string, etag: string) => Promise<{ etag: string } | 'conflict'>;
  remove: () => Promise<void>;
};

export class StackLockedError extends Error {
  holder: StackLockHolder;
  retryAfterMs: number;

  constructor(holder: StackLockHolder, nowMs: number) {
    super(`Another operation (${holder.operation}, invocation ${holder.invocationId}) is changing this stack.`);
    this.holder = holder;
    this.retryAfterMs = Math.max(0, holder.renewedAtMs + STACK_LOCK_LEASE_MS - nowMs);
  }
}

const parseHolder = (body: string): StackLockHolder | undefined => {
  try {
    const parsed = JSON.parse(body) as Partial<StackLockHolder>;
    if (typeof parsed.invocationId === 'string' && typeof parsed.renewedAtMs === 'number') {
      return { invocationId: parsed.invocationId, operation: String(parsed.operation), renewedAtMs: parsed.renewedAtMs };
    }
  } catch {
    // An unreadable lock is treated as expired below.
  }
  return undefined;
};

export type HeldStackLock = {
  /** False once another operation took the lock over, because this one could not renew it in time. */
  isHeld: () => boolean;
  release: () => Promise<void>;
};

export const acquireStackLock = async ({
  store,
  invocationId,
  operation,
  now = Date.now,
  setRenewTimer = (renew) => {
    const timer = setInterval(renew, STACK_LOCK_RENEW_INTERVAL_MS);
    timer.unref?.();
    return () => clearInterval(timer);
  },
  onLost = () => {}
}: {
  store: StackLockStore;
  invocationId: string;
  operation: string;
  now?: () => number;
  setRenewTimer?: (renew: () => void) => () => void;
  onLost?: () => void;
}): Promise<HeldStackLock> => {
  const bodyAt = (renewedAtMs: number) => JSON.stringify({ invocationId, operation, renewedAtMs });

  const take = async (): Promise<string> => {
    const created = await store.create(bodyAt(now()));
    if (created !== 'conflict') return created.etag;
    const existing = await store.read();
    // Released between the two calls.
    if (!existing) {
      const again = await store.create(bodyAt(now()));
      if (again !== 'conflict') return again.etag;
      throw new StackLockedError({ invocationId: 'unknown', operation: 'unknown', renewedAtMs: now() }, now());
    }
    const holder = parseHolder(existing.body);
    // The same invocation retrying its own step already holds the lock.
    if (holder && holder.invocationId !== invocationId && now() - holder.renewedAtMs < STACK_LOCK_LEASE_MS) {
      throw new StackLockedError(holder, now());
    }
    const replaced = await store.replace(bodyAt(now()), existing.etag);
    if (replaced === 'conflict') {
      throw new StackLockedError(
        holder ?? { invocationId: 'unknown', operation: 'unknown', renewedAtMs: now() },
        now()
      );
    }
    return replaced.etag;
  };

  let etag = await take();
  let held = true;
  let renewal: Promise<unknown> = Promise.resolve();
  const lose = () => {
    held = false;
    onLost();
  };
  const renew = () => {
    renewal = renewal.then(async () => {
      if (!held) return;
      try {
        const result = await store.replace(bodyAt(now()), etag);
        if (result === 'conflict') lose();
        else etag = result.etag;
      } catch {
        // A network blip: the next renewal tries again, and the lease covers several attempts.
      }
    });
  };
  const stopRenewing = setRenewTimer(renew);

  return {
    isHeld: () => held,
    release: async () => {
      stopRenewing();
      await renewal;
      if (!held) return;
      held = false;
      const current = await store.read();
      if (current && parseHolder(current.body)?.invocationId === invocationId) await store.remove();
    }
  };
};
