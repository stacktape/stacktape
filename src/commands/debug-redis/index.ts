import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { redisKeys, redisGet, redisTtl, redisInfo, redisType } from '@domain-services/debug-services/db-client';
import { stpErrors } from '@errors';
import { startPortForwardingSessions, type SsmPortForwardingTunnel } from '@utils/ssm-session';
import { locallyResolveSensitiveValue } from '@utils/stack-info-map-sensitive-values';
import { ExpectedError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

const SUPPORTED_OPERATIONS = ['keys', 'get', 'ttl', 'info', 'type'] as const;
type Operation = (typeof SUPPORTED_OPERATIONS)[number];

export const commandDebugRedis = async () => {
  await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: false,
    commandRequiresConfig: false
  });

  const args = globalStateManager.args as StacktapeCliArgs & {
    operation?: string;
    key?: string;
    pattern?: string;
    section?: string;
    limit?: number;
  };

  const { resourceName, bastionResource, operation = 'info', key, pattern = '*', section, limit = 100 } = args;

  if (!resourceName) {
    throw new ExpectedError(
      'CLI',
      'Missing required flag: --resourceName',
      'Provide --resourceName <redisClusterName>'
    );
  }

  if (!SUPPORTED_OPERATIONS.includes(operation as Operation)) {
    throw new ExpectedError(
      'CLI',
      `Invalid operation: ${operation}`,
      `Supported operations: ${SUPPORTED_OPERATIONS.join(', ')}`
    );
  }

  // Get resource info
  const resource = deployedStackOverviewManager.getStpResource({ nameChain: resourceName });
  if (!resource) {
    throw stpErrors.e98({ stpResourceName: resourceName });
  }

  if (resource.resourceType !== 'redis-cluster') {
    throw new ExpectedError(
      'CLI',
      `Resource "${resourceName}" is not a Redis cluster (type: ${resource.resourceType})`,
      'debug:redis supports redis-cluster resources only'
    );
  }

  // Get connection parameters
  const params = resource.referencableParams as Record<
    string,
    { value: unknown; ssmParameterName?: string } | undefined
  >;
  const host = params.host?.value as string;
  const port = (params.port?.value as number) || 6379;

  if (!host) {
    throw new ExpectedError(
      'CLI',
      'Could not retrieve Redis connection parameters',
      'Ensure the Redis cluster is deployed and accessible'
    );
  }

  // Fetch connection string from SSM to extract password
  let password: string | undefined;
  const connectionStringSsmParam = params.connectionString?.ssmParameterName;
  if (connectionStringSsmParam) {
    tuiManager.info(`Fetching connection string from SSM...`);
    const connectionString = await locallyResolveSensitiveValue({ ssmParameterName: connectionStringSsmParam });
    if (connectionString && connectionString !== '<<UNABLE_TO_RESOLVE>>') {
      // Parse password from rediss://default:PASSWORD@host:port
      const match = connectionString.match(/^rediss?:\/\/[^:]*:([^@]+)@/);
      if (match) {
        password = match[1];
      }
    }
  }

  // Redis clusters are typically VPC-only, need bastion tunnel
  let tunnels: SsmPortForwardingTunnel[] = [];
  let connectionHost = host;
  let connectionPort = port;

  if (bastionResource) {
    const targets = deployedStackOverviewManager.resolveBastionTunnelsForTarget({
      targetStpName: resourceName,
      bastionStpName: bastionResource
    });

    if (targets.length > 0) {
      tunnels = await startPortForwardingSessions({ targets });
      connectionHost = '127.0.0.1';
      connectionPort = tunnels[0].localPort;
      tuiManager.info(`Tunnel established: localhost:${connectionPort} -> ${host}:${port}`);
    }
  }

  // Register cleanup hook
  if (tunnels.length > 0) {
    applicationManager.registerCleanUpHook(async () => {
      await Promise.all(tunnels.map((t) => t.kill()));
    });
  }

  const conn = {
    host: connectionHost,
    port: connectionPort,
    password,
    tls: Boolean(password), // ElastiCache with password requires TLS
    tlsServername: tunnels.length > 0 ? host : undefined // Use real host for SNI when tunneling
  };

  let result;

  switch (operation as Operation) {
    case 'keys':
      result = await redisKeys(conn, { pattern, limit });
      break;

    case 'get':
      if (!key) {
        throw new ExpectedError('CLI', 'Missing required flag: --key for get operation', 'Provide --key <keyName>');
      }
      result = await redisGet(conn, { key });
      break;

    case 'ttl':
      if (!key) {
        throw new ExpectedError('CLI', 'Missing required flag: --key for ttl operation', 'Provide --key <keyName>');
      }
      result = await redisTtl(conn, { key });
      break;

    case 'info':
      result = await redisInfo(conn, { section });
      break;

    case 'type':
      if (!key) {
        throw new ExpectedError('CLI', 'Missing required flag: --key for type operation', 'Provide --key <keyName>');
      }
      result = await redisType(conn, { key });
      break;
  }

  // Close tunnels
  if (tunnels.length > 0) {
    await Promise.all(tunnels.map((t) => t.kill()));
  }

  if (!result.ok) {
    const errResult = result as { ok: false; error: string; hint?: string };
    throw new ExpectedError('CLI', `Redis error: ${errResult.error}`, errResult.hint);
  }

  // Output
  if (isAgentMode()) {
    tuiManager.info(JSON.stringify({ ok: true, resource: resourceName, operation, ...result }, null, 2));
  } else {
    tuiManager.info(`Redis ${operation} result for "${resourceName}":\n`);
    tuiManager.info(JSON.stringify(result, null, 2));
  }

  return null;
};
