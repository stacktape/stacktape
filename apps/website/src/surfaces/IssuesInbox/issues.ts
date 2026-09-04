/*
 * The four issues in `acme-project`'s inbox.
 *
 * They are the same incident the metrics surface plots: 47 occurrences of an undefined-property
 * failure in the checkout worker, starting when the invocation spike did. The other three are the
 * ordinary background of a running application — a connection-pool timeout, a Redis reset that has
 * already been fixed, and a validation error somebody decided not to care about.
 *
 * Error types use Console's own labels for the six kinds it recognises; statuses use Console's
 * OPEN / RESOLVED / IGNORED rather than a friendlier invention, because a reader who has the product
 * open in another tab should see the same words.
 */

type IssueStatus = 'OPEN' | 'RESOLVED' | 'IGNORED';

export type Issue = {
  id: string;
  /** The grouped error message. One line, ellipsised in the list. */
  message: string;
  /** Console's label for the kind of failure. */
  kind: string;
  resource: string;
  runtime: string;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  status: IssueStatus;
};

export const ISSUES: readonly Issue[] = [
  {
    id: 'checkout-items',
    message: "TypeError: Cannot read properties of undefined (reading 'items')",
    kind: 'Uncaught Exception',
    resource: 'worker',
    runtime: 'nodejs22.x',
    occurrences: 47,
    firstSeen: 'Sep 24, 15:24',
    lastSeen: '8 minutes ago',
    status: 'OPEN'
  },
  {
    id: 'pool-timeout',
    message: 'PrismaClientKnownRequestError: Timed out fetching a new connection from the connection pool',
    kind: 'Unhandled Promise Rejection',
    resource: 'apiService',
    runtime: 'nodejs22.x',
    occurrences: 12,
    firstSeen: 'Sep 23, 21:02',
    lastSeen: '2 hours ago',
    status: 'OPEN'
  },
  {
    id: 'redis-reset',
    message: 'Error: Redis connection to cache.acme.internal:6379 failed — ECONNRESET',
    kind: 'Caught Error',
    resource: 'apiService',
    runtime: 'nodejs22.x',
    occurrences: 3,
    firstSeen: 'Sep 19, 04:41',
    lastSeen: '5 days ago',
    status: 'RESOLVED'
  },
  {
    id: 'currency-validation',
    message: 'ValidationError: checkout.currency must be one of [EUR, USD]',
    kind: 'Caught Error',
    resource: 'apiService',
    runtime: 'nodejs22.x',
    occurrences: 1,
    firstSeen: 'Sep 11, 12:30',
    lastSeen: '13 days ago',
    status: 'IGNORED'
  }
];

export type StackFrame = {
  fn: string;
  file: string;
  line: number;
  column: number;
  /** The source line itself, shown under the frame the error was thrown from. */
  source?: string;
};

/** The selected issue's frames, innermost first, as Console's `StackTrace` orders them. */
export const STACK_FRAMES: readonly StackFrame[] = [
  {
    fn: 'handleCheckout',
    file: 'api/src/worker.ts',
    line: 64,
    column: 28,
    source: 'const total = order.items.reduce((sum, item) => sum + item.price, 0);'
  },
  { fn: 'processJob', file: 'api/src/worker.ts', line: 22, column: 9 },
  { fn: 'Worker.<anonymous>', file: 'node_modules/bullmq/dist/cjs/classes/worker.js', line: 412, column: 24 },
  { fn: 'processTicksAndRejections', file: 'node:internal/process/task_queues', line: 95, column: 5 }
];

/**
 * Occurrences per hour over the last day.
 *
 * The burst sits where the `worker` error spike sits on the metrics surface — same incident, same
 * shape, seen from the error tracker instead of from CloudWatch.
 */
export const OCCURRENCES_BY_HOUR: readonly number[] = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 2, 19, 14, 7, 3, 1
];
