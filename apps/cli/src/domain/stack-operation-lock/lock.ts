/**
 * One operation at a time on a stack. CloudFormation allows one update, but a fast deployment does not go through it, so
 * two CI jobs, or a rollback during a fast deployment, could otherwise replace each other's rollout.
 *
 * The lock is an object in the deployment bucket. Conditional writes make taking it atomic. The holder renews it while
 * it runs, so the lock of a killed CI job expires and the next operation takes it over. Releasing it is also a conditional
 * write: read-then-delete could remove the lock of an operation that took over in between.
 */

export const STACK_LOCK_S3_KEY = 'stack-operation-lock.json';
/** A killed operation blocks the next one for at most this long. */
export const STACK_LOCK_LEASE_MS = 120_000;
export const STACK_LOCK_RENEW_INTERVAL_MS = 30_000;

const RELEASED_BODY = JSON.stringify({ released: true });

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

export class StackLockLostError extends Error {
  constructor() {
    super('Another operation took over this stack, because this one did not renew its lock in time.');
  }
}

const parseHolder = (body: string): StackLockHolder | undefined => {
  try {
    const parsed = JSON.parse(body) as Partial<StackLockHolder>;
    if (typeof parsed.invocationId === 'string' && typeof parsed.renewedAtMs === 'number') {
      return {
        invocationId: parsed.invocationId,
        operation: String(parsed.operation),
        renewedAtMs: parsed.renewedAtMs
      };
    }
  } catch {
    // An unreadable lock counts as free.
  }
  return undefined;
};

export type HeldStackLock = {
  /** False once another operation took the lock over, because this one could not renew it in time. */
  isHeld: () => boolean;
  /**
   * Renews the lock now and throws `StackLockLostError` if another operation took it over. Call it before a step that
   * changes the stack, after anything that can take long: a paused process doesn't notice by itself.
   */
  confirm: () => Promise<void>;
  release: () => Promise<void>;
  /** Stops renewing without touching the lock, for an operation that is about to delete the bucket holding it. */
  detach: () => void;
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
  const unknownHolder = () => ({ invocationId: 'unknown', operation: 'unknown', renewedAtMs: now() });

  const take = async (): Promise<string> => {
    const created = await store.create(bodyAt(now()));
    if (created !== 'conflict') return created.etag;
    const existing = await store.read();
    // Deleted between the two calls, for example by a stack delete emptying the bucket.
    if (!existing) {
      const again = await store.create(bodyAt(now()));
      if (again !== 'conflict') return again.etag;
      throw new StackLockedError(unknownHolder(), now());
    }
    const holder = parseHolder(existing.body);
    // The same invocation retrying its own step already holds the lock.
    if (holder && holder.invocationId !== invocationId && now() - holder.renewedAtMs < STACK_LOCK_LEASE_MS) {
      throw new StackLockedError(holder, now());
    }
    const replaced = await store.replace(bodyAt(now()), existing.etag);
    if (replaced === 'conflict') throw new StackLockedError(holder ?? unknownHolder(), now());
    return replaced.etag;
  };

  let etag = await take();
  let held = true;
  let renewal: Promise<unknown> = Promise.resolve();
  const lose = () => {
    held = false;
    onLost();
  };
  const renewNow = async () => {
    if (!held) return;
    const result = await store.replace(bodyAt(now()), etag);
    if (result === 'conflict') lose();
    else etag = result.etag;
  };
  const stopRenewing = setRenewTimer(() => {
    // A network blip: the next renewal tries again, and the lease covers several attempts.
    renewal = renewal.then(() => renewNow().catch(() => {}));
  });

  return {
    isHeld: () => held,
    confirm: async () => {
      await renewal;
      await renewNow();
      if (!held) throw new StackLockLostError();
    },
    release: async () => {
      stopRenewing();
      await renewal;
      if (!held) return;
      held = false;
      // A failed release only means the next operation waits for the lease to end.
      await store.replace(RELEASED_BODY, etag).catch(() => {});
    },
    detach: () => {
      stopRenewing();
      held = false;
    }
  };
};
