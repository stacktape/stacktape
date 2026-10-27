import { getHttpStatus, waitForTcpPort } from '../port-utils';

/**
 * How long a rebuilt container must keep running after it first serves before it replaces the previous one: a process
 * manager (gunicorn, nginx, supervisord, a Node cluster primary) accepts connections before its app has loaded and
 * exits when the app fails to.
 */
export const CONTAINER_SETTLE_MS = 2000;

/** Statuses with which a proxy in the container says that the app behind it does not answer. */
const PROXY_ERROR_STATUSES = new Set([502, 503, 504]);

/**
 * Waits until a container run serves. `docker run` starts the container long before the app in it listens, so a run
 * with a port serves once that port accepts connections; one without (a worker) at once.
 *
 * A rebuilt run (`confirm`) replaces a working one, so it must show more: an HTTP workload answers a request without a
 * proxy's 502-504, and every run is still running `settleMs` later. An interpreted app that cannot load its code has
 * exited by then, also under a process manager that accepted connections first.
 */
export const waitUntilRunServes = async ({
  port,
  servesHttp,
  confirm,
  timeoutMs,
  settleMs = CONTAINER_SETTLE_MS,
  shouldStop
}: {
  /** The run's published port; `undefined` for a container without one. */
  port: number | undefined;
  servesHttp: boolean;
  confirm: boolean;
  timeoutMs: number;
  settleMs?: number;
  /** The run exited or is being stopped. */
  shouldStop: () => boolean;
}): Promise<'ready' | 'timeout' | 'stopped'> => {
  const deadline = Date.now() + timeoutMs;
  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  let result = port === undefined ? ('ready' as const) : await waitForTcpPort({ port, timeoutMs, shouldStop });
  if (confirm && result === 'ready' && port !== undefined && servesHttp) {
    result = 'timeout';
    while (Date.now() < deadline && !shouldStop()) {
      const status = await getHttpStatus({ port, timeoutMs: Math.min(5000, timeoutMs) });
      if (status !== undefined && !PROXY_ERROR_STATUSES.has(status)) {
        result = 'ready';
        break;
      }
      await pause(200);
    }
  }
  if (confirm && result === 'ready') {
    const settled = Date.now() + settleMs;
    while (Date.now() < settled && !shouldStop()) await pause(100);
  }
  return shouldStop() ? 'stopped' : result;
};

/**
 * Whether a start command runs a migration before the server, such as `alembic upgrade head && uvicorn main:app`. A
 * failed rebuild then says that the new run may already have changed the database the previous build uses.
 */
export const startCommandMayChangeData = (command: string) =>
  /&&|;/.test(command) && /migrat|alembic\s+upgrade|db\s+push|db:push|flyway|liquibase|goose\s+up/i.test(command);
