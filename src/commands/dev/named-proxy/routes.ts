import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type RouteMapping = {
  hostname: string;
  port: number;
  pid: number;
};

const FILE_MODE = 0o644;
const DIR_MODE = 0o755;
const STALE_LOCK_THRESHOLD_MS = 10000;
const LOCK_MAX_RETRIES = 20;
const LOCK_RETRY_DELAY_MS = 50;

const isValidRoute = (value: unknown): value is RouteMapping => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RouteMapping).hostname === 'string' &&
    typeof (value as RouteMapping).port === 'number' &&
    typeof (value as RouteMapping).pid === 'number'
  );
};

export class RouteStore {
  readonly dir: string;
  readonly pidPath: string;
  readonly portFilePath: string;
  private readonly routesPath: string;
  private readonly lockPath: string;

  constructor(dir: string) {
    this.dir = dir;
    this.routesPath = join(dir, 'routes.json');
    this.lockPath = join(dir, 'routes.lock');
    this.pidPath = join(dir, 'proxy.pid');
    this.portFilePath = join(dir, 'proxy.port');
  }

  ensureDir = (): void => {
    if (!existsSync(this.dir)) {
      mkdirSync(this.dir, { recursive: true, mode: DIR_MODE });
    }
  };

  getRoutesPath = (): string => this.routesPath;

  private static readonly sleepBuffer = new Int32Array(new SharedArrayBuffer(4));

  private syncSleep = (ms: number): void => {
    Atomics.wait(RouteStore.sleepBuffer, 0, 0, ms);
  };

  private acquireLock = (maxRetries = LOCK_MAX_RETRIES, retryDelayMs = LOCK_RETRY_DELAY_MS): boolean => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        mkdirSync(this.lockPath);
        return true;
      } catch {
        try {
          const stat = statSync(this.lockPath);
          if (Date.now() - stat.mtimeMs > STALE_LOCK_THRESHOLD_MS) {
            rmSync(this.lockPath, { recursive: true, force: true });
            continue;
          }
        } catch {
          continue;
        }
        this.syncSleep(retryDelayMs);
      }
    }
    return false;
  };

  private releaseLock = (): void => {
    rmSync(this.lockPath, { recursive: true, force: true });
  };

  private isProcessAlive = (pid: number): boolean => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };

  loadRoutes = (persistCleanup = false): RouteMapping[] => {
    if (!existsSync(this.routesPath)) return [];

    try {
      const parsed = JSON.parse(readFileSync(this.routesPath, 'utf-8')) as unknown;
      if (!Array.isArray(parsed)) return [];
      const routes: RouteMapping[] = parsed.filter(isValidRoute);
      const alive = routes.filter((r) => this.isProcessAlive(r.pid));
      if (persistCleanup && alive.length !== routes.length) {
        writeFileSync(this.routesPath, JSON.stringify(alive, null, 2), { mode: FILE_MODE });
      }
      return alive;
    } catch {
      return [];
    }
  };

  private saveRoutes = (routes: RouteMapping[]): void => {
    writeFileSync(this.routesPath, JSON.stringify(routes, null, 2), { mode: FILE_MODE });
  };

  addRoute = (hostname: string, port: number, pid: number): void => {
    this.ensureDir();
    if (!this.acquireLock()) throw new Error('Failed to acquire route lock');
    try {
      const routes = this.loadRoutes(true).filter((r) => r.hostname !== hostname);
      routes.push({ hostname, port, pid });
      this.saveRoutes(routes);
    } finally {
      this.releaseLock();
    }
  };

  removeRoute = (hostname: string): void => {
    this.ensureDir();
    if (!this.acquireLock()) throw new Error('Failed to acquire route lock');
    try {
      this.saveRoutes(this.loadRoutes(true).filter((r) => r.hostname !== hostname));
    } finally {
      this.releaseLock();
    }
  };
}
