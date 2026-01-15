import {
  GetFunctionConfigurationCommand,
  LambdaClient,
  ResourceConflictException,
  ResourceNotFoundException,
  UpdateFunctionConfigurationCommand
} from '@aws-sdk/client-lambda';
import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import type { LocalResourceInstance } from '../local-resources';
import type { TunnelInfo } from '../tunnel-manager';

type LambdaEnvBackup = {
  functionName: string;
  originalEnvVars: Record<string, string>;
};

const envBackups: LambdaEnvBackup[] = [];
let cleanupHookRegistered = false;

const LAMBDA_UPDATE_RETRY_ATTEMPTS = 3;
const LAMBDA_UPDATE_RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getLambdaClient = (): LambdaClient => {
  const region = globalStateManager.region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  if (!region) {
    throw new Error('AWS region not configured. Set AWS_REGION environment variable or configure Stacktape region.');
  }
  return new LambdaClient({ region });
};

const buildLambdaFunctionName = (stpResourceName: string): string => {
  const stackName = globalStateManager.targetStack.stackName;
  return `${stackName}-${stpResourceName}`;
};

const isLambdaDeployed = async (functionName: string): Promise<boolean> => {
  const client = getLambdaClient();
  try {
    await client.send(new GetFunctionConfigurationCommand({ FunctionName: functionName }));
    return true;
  } catch (err) {
    if (err instanceof ResourceNotFoundException) {
      return false;
    }
    throw err;
  }
};

const getLambdaReferencedResources = (lambdaConfig: {
  connectTo?: string[];
  environment?: Record<string, any>;
}): string[] => {
  const referenced = new Set<string>();

  // From connectTo
  if (lambdaConfig.connectTo) {
    for (const resourceName of lambdaConfig.connectTo) {
      referenced.add(resourceName);
    }
  }

  // From $ResourceParam directives in environment variables
  if (lambdaConfig.environment) {
    const envString = JSON.stringify(lambdaConfig.environment);
    const resourceParamRegex = /\$ResourceParam\s*\(\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = resourceParamRegex.exec(envString)) !== null) {
      referenced.add(match[1]);
    }
  }

  return Array.from(referenced);
};

export const detectLambdasNeedingTunnels = async (
  localResourceNames: string[]
): Promise<{
  lambdasNeedingTunnels: Array<{ name: string; functionName: string; referencedLocalResources: string[] }>;
  skippedLambdas: Array<{ name: string; reason: string }>;
}> => {
  const localResourceSet = new Set(localResourceNames);
  const lambdasNeedingTunnels: Array<{ name: string; functionName: string; referencedLocalResources: string[] }> = [];
  const skippedLambdas: Array<{ name: string; reason: string }> = [];

  const functions = configManager.functions || [];
  if (functions.length === 0) {
    return { lambdasNeedingTunnels, skippedLambdas };
  }

  for (const lambda of functions) {
    const referencedResources = getLambdaReferencedResources(lambda);
    const referencedLocalResources = referencedResources.filter((r) => localResourceSet.has(r));

    if (referencedLocalResources.length === 0) continue;

    // Check if Lambda is in VPC (joinDefaultVpc: true)
    if ((lambda as any).joinDefaultVpc) {
      skippedLambdas.push({
        name: lambda.name,
        reason: 'Lambda is in VPC without NAT gateway - cannot connect to external tunnels'
      });
      continue;
    }

    // Build function name and check if deployed
    const functionName = buildLambdaFunctionName(lambda.name);

    try {
      const deployed = await isLambdaDeployed(functionName);

      if (!deployed) {
        skippedLambdas.push({
          name: lambda.name,
          reason: 'Lambda is not deployed yet - deploy first with: stacktape deploy'
        });
        continue;
      }

      lambdasNeedingTunnels.push({
        name: lambda.name,
        functionName,
        referencedLocalResources
      });
    } catch (err) {
      skippedLambdas.push({
        name: lambda.name,
        reason: `Failed to check Lambda deployment status: ${err.message}`
      });
    }
  }

  return { lambdasNeedingTunnels, skippedLambdas };
};

/**
 * Replace localhost/docker host references in a connection string with the tunnel URL.
 * Handles various connection string formats:
 * - postgresql://user:pass@localhost:5432/db
 * - mysql://user:pass@127.0.0.1:3306/db
 * - redis://host.docker.internal:6379
 * - http://localhost:8000 (DynamoDB)
 */
const buildTunnelConnectionString = (originalConnectionString: string, tunnel: TunnelInfo): string => {
  const tunnelHost = tunnel.publicHost;
  const tunnelPort = tunnel.publicPort;

  // Pattern to match host:port combinations for localhost-like addresses
  // This handles: localhost, 127.0.0.1, host.docker.internal
  const hostPortPattern = /(localhost|127\.0\.0\.1|host\.docker\.internal):(\d+)/g;

  return originalConnectionString.replace(hostPortPattern, `${tunnelHost}:${tunnelPort}`);
};

const updateLambdaWithRetry = async (
  client: LambdaClient,
  functionName: string,
  envVars: Record<string, string>
): Promise<void> => {
  for (let attempt = 1; attempt <= LAMBDA_UPDATE_RETRY_ATTEMPTS; attempt++) {
    try {
      await client.send(
        new UpdateFunctionConfigurationCommand({
          FunctionName: functionName,
          Environment: { Variables: envVars }
        })
      );
      return;
    } catch (err) {
      // ResourceConflictException means Lambda is being updated by another process
      if (err instanceof ResourceConflictException) {
        if (attempt < LAMBDA_UPDATE_RETRY_ATTEMPTS) {
          tuiManager.warn(
            `Lambda ${functionName} is being updated, retrying in ${LAMBDA_UPDATE_RETRY_DELAY_MS / 1000}s...`
          );
          await sleep(LAMBDA_UPDATE_RETRY_DELAY_MS);
          continue;
        }
      }
      throw err;
    }
  }
};

export const updateLambdaEnvVarsWithTunnels = async ({
  lambdas,
  tunnels,
  localResources
}: {
  lambdas: Array<{ name: string; functionName: string; referencedLocalResources: string[] }>;
  tunnels: TunnelInfo[];
  localResources: LocalResourceInstance[];
}): Promise<{ updated: string[]; failed: string[] }> => {
  const client = getLambdaClient();
  const tunnelMap = new Map(tunnels.map((t) => [t.resourceName, t]));
  const localResourceMap = new Map(localResources.map((r) => [r.name, r]));
  const updated: string[] = [];
  const failed: string[] = [];

  for (const lambda of lambdas) {
    try {
      // Get current configuration
      const currentConfig = await client.send(
        new GetFunctionConfigurationCommand({ FunctionName: lambda.functionName })
      );

      const currentEnvVars = currentConfig.Environment?.Variables || {};

      // Store backup before making any changes
      envBackups.push({
        functionName: lambda.functionName,
        originalEnvVars: { ...currentEnvVars }
      });

      // Build new env vars with tunnel URLs
      const newEnvVars = { ...currentEnvVars };
      let hasChanges = false;

      for (const resourceName of lambda.referencedLocalResources) {
        const tunnel = tunnelMap.get(resourceName);
        const localResource = localResourceMap.get(resourceName);

        if (!tunnel || !localResource) {
          tuiManager.warn(`No tunnel found for resource ${resourceName}, skipping env var update for this resource`);
          continue;
        }

        // Convert resource name to env var format (camelCase -> SNAKE_CASE)
        // e.g., "postgresDb" -> "POSTGRES_DB", "myDatabase" -> "MY_DATABASE"
        const upperResourceName = resourceName
          .replace(/([a-z])([A-Z])/g, '$1_$2') // camelCase to snake_case
          .replace(/-/g, '_') // kebab-case to snake_case
          .toUpperCase();

        // Update any env var that contains localhost references and matches the resource name
        for (const [envKey, envValue] of Object.entries(currentEnvVars)) {
          if (typeof envValue !== 'string') continue;

          // Check if this env var is related to the resource
          const envKeyUpper = envKey.toUpperCase();
          const isResourceRelated =
            envKeyUpper.includes(upperResourceName) ||
            (envKey.startsWith('STP_') && envKeyUpper.includes(upperResourceName));

          if (!isResourceRelated) continue;

          // Check if it contains localhost-like references
          if (
            envValue.includes('localhost') ||
            envValue.includes('127.0.0.1') ||
            envValue.includes('host.docker.internal')
          ) {
            const newValue = buildTunnelConnectionString(envValue, tunnel);
            if (newValue !== envValue) {
              newEnvVars[envKey] = newValue;
              hasChanges = true;
            }
          }
        }

        // For DynamoDB, also set AWS_ENDPOINT_URL_DYNAMODB
        if (localResource.type === 'dynamodb') {
          newEnvVars['AWS_ENDPOINT_URL_DYNAMODB'] = `http://${tunnel.publicHost}:${tunnel.publicPort}`;
          hasChanges = true;
        }

        // Explicitly update standard Stacktape env vars if they exist
        const connectionStringKey = `STP_${upperResourceName}_CONNECTION_STRING`;
        if (currentEnvVars[connectionStringKey]) {
          const newValue = buildTunnelConnectionString(currentEnvVars[connectionStringKey], tunnel);
          if (newValue !== currentEnvVars[connectionStringKey]) {
            newEnvVars[connectionStringKey] = newValue;
            hasChanges = true;
          }
        }

        const hostKey = `STP_${upperResourceName}_HOST`;
        if (currentEnvVars[hostKey]) {
          newEnvVars[hostKey] = tunnel.publicHost;
          hasChanges = true;
        }

        const portKey = `STP_${upperResourceName}_PORT`;
        if (currentEnvVars[portKey]) {
          newEnvVars[portKey] = String(tunnel.publicPort);
          hasChanges = true;
        }

        const endpointKey = `STP_${upperResourceName}_ENDPOINT`;
        if (currentEnvVars[endpointKey]) {
          newEnvVars[endpointKey] = `http://${tunnel.publicHost}:${tunnel.publicPort}`;
          hasChanges = true;
        }
      }

      if (!hasChanges) {
        tuiManager.info(`No env var changes needed for Lambda ${lambda.name}`);
        // Remove the backup since we didn't make changes
        envBackups.pop();
        continue;
      }

      // Update Lambda configuration with retry logic
      await updateLambdaWithRetry(client, lambda.functionName, newEnvVars);

      updated.push(lambda.name);
      tuiManager.success(`Updated Lambda env vars: ${lambda.name}`);
    } catch (err) {
      failed.push(lambda.name);
      tuiManager.warn(`Failed to update Lambda ${lambda.name}: ${err.message}`);
      // Remove failed backup
      const backupIndex = envBackups.findIndex((b) => b.functionName === lambda.functionName);
      if (backupIndex !== -1) {
        envBackups.splice(backupIndex, 1);
      }
    }
  }

  return { updated, failed };
};

export const restoreLambdaEnvVars = async (): Promise<{ restored: string[]; failed: string[] }> => {
  const restored: string[] = [];
  const failed: string[] = [];

  if (envBackups.length === 0) {
    return { restored, failed };
  }

  const client = getLambdaClient();

  tuiManager.info('Restoring Lambda env vars...');

  // Restore in reverse order (LIFO)
  const backupsToRestore = [...envBackups].reverse();

  for (const backup of backupsToRestore) {
    try {
      await updateLambdaWithRetry(client, backup.functionName, backup.originalEnvVars);
      restored.push(backup.functionName);
    } catch (err) {
      failed.push(backup.functionName);
      tuiManager.warn(`Failed to restore Lambda ${backup.functionName}: ${err.message}`);
    }
  }

  envBackups.length = 0;

  if (restored.length > 0) {
    tuiManager.success(`Lambda env vars restored (${restored.length} function${restored.length > 1 ? 's' : ''})`);
  }

  if (failed.length > 0) {
    tuiManager.warn(
      `Failed to restore ${failed.length} Lambda function${failed.length > 1 ? 's' : ''}. ` +
        `You may need to redeploy these functions: ${failed.join(', ')}`
    );
  }

  return { restored, failed };
};

export const hasEnvBackups = (): boolean => {
  return envBackups.length > 0;
};

export const getBackedUpFunctionNames = (): string[] => {
  return envBackups.map((b) => b.functionName);
};

// Register cleanup hook (only once)
export const registerLambdaEnvCleanupHook = (): void => {
  if (cleanupHookRegistered) return;
  cleanupHookRegistered = true;

  applicationManager.registerCleanUpHook(async () => {
    await restoreLambdaEnvVars();
  });
};

// Auto-register cleanup hook when module is loaded
registerLambdaEnvCleanupHook();
