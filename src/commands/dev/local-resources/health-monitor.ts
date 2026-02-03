/**
 * Health monitoring for local database resources.
 * Periodically checks if containers are healthy and can accept connections.
 * Notifies DevTui and attempts auto-restart on failures.
 */

import type { LocalResourceInstance, LocalResourceType } from './index';
import { tuiManager } from '@application-services/tui-manager';
import { execDocker, inspectDockerContainer } from '@shared/utils/docker';
import { devTuiManager } from 'src/app/tui-manager/dev-tui';
import { createCleanupHook } from '../cleanup-utils';
import { DEV_CONFIG } from '../dev-config';

const { healthCheck: HEALTH_CONFIG } = DEV_CONFIG.localResources;

type HealthStatus = 'healthy' | 'unhealthy' | 'recovering' | 'failed';

type MonitoredResource = {
  instance: LocalResourceInstance;
  status: HealthStatus;
  consecutiveFailures: number;
  restartAttempts: number;
  lastCheck: number;
};

const monitoredResources = new Map<string, MonitoredResource>();
let monitorInterval: ReturnType<typeof setInterval> | null = null;
let onHealthChange: ((name: string, status: HealthStatus, error?: string) => void) | null = null;

/**
 * Health check functions for each resource type.
 * Returns true if healthy, false otherwise.
 */
const healthChecks: Record<LocalResourceType, (instance: LocalResourceInstance) => Promise<boolean>> = {
  postgres: async (instance) => {
    const { exitCode } = await execDocker(['exec', instance.containerName, 'pg_isready', '-U', 'postgres'], {
      skipHandleError: true
    });
    return exitCode === 0;
  },

  mysql: async (instance) => {
    const { exitCode } = await execDocker(
      ['exec', instance.containerName, 'mysqladmin', 'ping', '-h', 'localhost', '--silent'],
      { skipHandleError: true }
    );
    return exitCode === 0;
  },

  mariadb: async (instance) => {
    // MariaDB uses the same health check as MySQL
    const { exitCode } = await execDocker(
      ['exec', instance.containerName, 'mysqladmin', 'ping', '-h', 'localhost', '--silent'],
      { skipHandleError: true }
    );
    return exitCode === 0;
  },

  redis: async (instance) => {
    const password = instance.credentials?.password;
    const pingArgs = password
      ? ['exec', instance.containerName, 'redis-cli', '-a', password, 'ping']
      : ['exec', instance.containerName, 'redis-cli', 'ping'];
    const { stdout, exitCode } = await execDocker(pingArgs, { skipHandleError: true });
    return exitCode === 0 && stdout.includes('PONG');
  },

  dynamodb: async (instance) => {
    try {
      const response = await fetch(`http://${instance.host}:${instance.actualPort}`, {
        method: 'POST',
        headers: {
          'X-Amz-Target': 'DynamoDB_20120810.ListTables',
          'Content-Type': 'application/x-amz-json-1.0',
          Authorization:
            'AWS4-HMAC-SHA256 Credential=local/20200101/local/dynamodb/aws4_request, SignedHeaders=host;x-amz-date, Signature=local',
          'X-Amz-Date': '20200101T000000Z'
        },
        body: '{}'
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  opensearch: async (instance) => {
    try {
      const response = await fetch(`http://${instance.host}:${instance.actualPort}`);
      return response.ok;
    } catch {
      return false;
    }
  }
};

/**
 * Check if a container is running via Docker inspect.
 */
const isContainerRunning = async (containerName: string): Promise<boolean> => {
  const info = await inspectDockerContainer(containerName);
  return info?.State?.Running === true;
};

/**
 * Perform health check for a single resource.
 */
const checkResourceHealth = async (resource: MonitoredResource): Promise<boolean> => {
  const { instance } = resource;

  // First check if container is running
  if (!(await isContainerRunning(instance.containerName))) {
    return false;
  }

  // Then perform resource-specific health check
  const checkFn = healthChecks[instance.type];
  if (!checkFn) {
    // Unknown type, assume healthy if container is running
    return true;
  }

  try {
    return await checkFn(instance);
  } catch {
    return false;
  }
};

/**
 * Handle health check result for a resource.
 */
const handleHealthResult = async (name: string, isHealthy: boolean): Promise<void> => {
  const resource = monitoredResources.get(name);
  if (!resource) return;

  resource.lastCheck = Date.now();

  if (isHealthy) {
    // Reset failure count on success
    if (resource.status === 'recovering') {
      resource.status = 'healthy';
      resource.consecutiveFailures = 0;
      resource.restartAttempts = 0;
      tuiManager.success(`${name} recovered and is healthy`);
      updateDevTuiStatus(name, 'running');
      onHealthChange?.(name, 'healthy');
    } else if (resource.status === 'unhealthy') {
      resource.status = 'healthy';
      resource.consecutiveFailures = 0;
      tuiManager.success(`${name} is healthy again`);
      updateDevTuiStatus(name, 'running');
      onHealthChange?.(name, 'healthy');
    } else if (resource.consecutiveFailures > 0) {
      // Had some failures but recovered before threshold
      resource.consecutiveFailures = 0;
    }
    return;
  }

  // Health check failed
  resource.consecutiveFailures++;

  if (resource.consecutiveFailures >= HEALTH_CONFIG.failureThreshold) {
    const errorMsg = `Health check failed ${resource.consecutiveFailures} times`;

    if (resource.status === 'healthy' || resource.status === 'recovering') {
      resource.status = 'unhealthy';
      tuiManager.warn(`${name} is unhealthy: ${errorMsg}`);
      updateDevTuiStatus(name, 'error', errorMsg);
      onHealthChange?.(name, 'unhealthy', errorMsg);

      // Attempt auto-restart if enabled
      if (HEALTH_CONFIG.autoRestart && resource.restartAttempts < HEALTH_CONFIG.maxRestartAttempts) {
        await attemptRestart(name);
      } else if (resource.restartAttempts >= HEALTH_CONFIG.maxRestartAttempts) {
        resource.status = 'failed';
        const failMsg = `Failed after ${resource.restartAttempts} restart attempts`;
        tuiManager.warn(`${name} ${failMsg}. Manual intervention required.`);
        updateDevTuiStatus(name, 'error', failMsg);
        onHealthChange?.(name, 'failed', failMsg);
      }
    }
  }
};

/**
 * Attempt to restart a failed container.
 */
const attemptRestart = async (name: string): Promise<void> => {
  const resource = monitoredResources.get(name);
  if (!resource) return;

  resource.restartAttempts++;
  resource.status = 'recovering';
  tuiManager.info(
    `Attempting to restart ${name} (attempt ${resource.restartAttempts}/${HEALTH_CONFIG.maxRestartAttempts})...`
  );
  updateDevTuiStatus(name, 'starting');

  try {
    // Try to start the container (it may be stopped)
    await execDocker(['start', resource.instance.containerName], { skipHandleError: true });

    // Wait a bit for the container to initialize
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check if it's healthy now
    const isHealthy = await checkResourceHealth(resource);
    if (isHealthy) {
      resource.status = 'healthy';
      resource.consecutiveFailures = 0;
      tuiManager.success(`${name} restarted successfully`);
      updateDevTuiStatus(name, 'running');
      onHealthChange?.(name, 'healthy');
    } else {
      resource.status = 'unhealthy';
      const errorMsg = 'Restart completed but health check still failing';
      tuiManager.warn(`${name}: ${errorMsg}`);
      updateDevTuiStatus(name, 'error', errorMsg);
    }
  } catch (err) {
    resource.status = 'unhealthy';
    const errorMsg = `Restart failed: ${err instanceof Error ? err.message : String(err)}`;
    tuiManager.warn(`${name}: ${errorMsg}`);
    updateDevTuiStatus(name, 'error', errorMsg);
  }
};

/**
 * Update DevTui status for a local resource.
 */
const updateDevTuiStatus = (name: string, status: 'running' | 'error' | 'starting', error?: string): void => {
  if (devTuiManager.running) {
    devTuiManager.setLocalResourceStatus(name, status, error ? { error } : undefined);
  }
};

/**
 * Run health checks for all monitored resources.
 */
const runHealthChecks = async (): Promise<void> => {
  const checks = Array.from(monitoredResources.entries()).map(async ([name, resource]) => {
    // Skip resources that are in failed state (manual intervention required)
    if (resource.status === 'failed') return;

    try {
      const isHealthy = await checkResourceHealth(resource);
      await handleHealthResult(name, isHealthy);
    } catch {
      // Treat any error as unhealthy
      await handleHealthResult(name, false);
    }
  });

  await Promise.all(checks);
};

/**
 * Start monitoring local resources for health.
 * Should be called after resources are started.
 */
export const startHealthMonitoring = (instances: LocalResourceInstance[]): void => {
  // Stop any existing monitoring
  stopHealthMonitoring();

  // Register resources for monitoring
  for (const instance of instances) {
    monitoredResources.set(instance.name, {
      instance,
      status: 'healthy',
      consecutiveFailures: 0,
      restartAttempts: 0,
      lastCheck: Date.now()
    });
  }

  if (monitoredResources.size === 0) return;

  // Start periodic health checks
  monitorInterval = setInterval(() => {
    runHealthChecks().catch((err) => {
      tuiManager.warn(`Health check error: ${err instanceof Error ? err.message : String(err)}`);
    });
  }, HEALTH_CONFIG.intervalMs);

  tuiManager.info(`Health monitoring started for ${monitoredResources.size} local resource(s)`);
};

/**
 * Stop health monitoring.
 */
export const stopHealthMonitoring = (): void => {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  monitoredResources.clear();
};

/**
 * Set a callback for health status changes.
 * Useful for updating Lambda env vars when resources recover.
 */
export const setHealthChangeCallback = (
  callback: ((name: string, status: HealthStatus, error?: string) => void) | null
): void => {
  onHealthChange = callback;
};

/**
 * Get current health status of all monitored resources.
 */
export const getHealthStatus = (): Map<string, HealthStatus> => {
  const status = new Map<string, HealthStatus>();
  for (const [name, resource] of monitoredResources) {
    status.set(name, resource.status);
  }
  return status;
};

/**
 * Manually trigger a health check (useful for testing or after manual intervention).
 */
export const triggerHealthCheck = async (name?: string): Promise<void> => {
  if (name) {
    const resource = monitoredResources.get(name);
    if (resource) {
      const isHealthy = await checkResourceHealth(resource);
      await handleHealthResult(name, isHealthy);
    }
  } else {
    await runHealthChecks();
  }
};

/**
 * Register cleanup hook for health monitoring.
 */
export const registerHealthMonitorCleanupHook = createCleanupHook('health-monitor', async () => {
  stopHealthMonitoring();
});
