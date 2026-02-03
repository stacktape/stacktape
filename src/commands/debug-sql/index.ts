import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { postgresQuery, mysqlQuery, type PostgresConnectionOpts } from '@domain-services/debug-services/db-client';
import { stpErrors } from '@errors';
import { startPortForwardingSessions, type SsmPortForwardingTunnel } from '@utils/ssm-session';
import { locallyResolveSensitiveValue } from '@utils/stack-info-map-sensitive-values';
import { ExpectedError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

const SUPPORTED_DB_TYPES = ['relational-database'] as const;

export const commandDebugSql = async () => {
  await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: false,
    commandRequiresConfig: false
  });

  const args = globalStateManager.args as StacktapeCliArgs & {
    sql?: string;
    limit?: number;
    timeout?: number;
  };

  const { resourceName, bastionResource, sql, limit = 1000, timeout = 30000 } = args;

  if (!resourceName) {
    throw new ExpectedError('CLI', 'Missing required flag: --resourceName', 'Provide --resourceName <databaseName>');
  }

  if (!sql) {
    throw new ExpectedError('CLI', 'Missing required flag: --sql', 'Provide --sql "SELECT * FROM table LIMIT 10"');
  }

  // Get resource info
  const resource = deployedStackOverviewManager.getStpResource({ nameChain: resourceName });
  if (!resource) {
    throw stpErrors.e98({ stpResourceName: resourceName });
  }

  if (!SUPPORTED_DB_TYPES.includes(resource.resourceType as (typeof SUPPORTED_DB_TYPES)[number])) {
    throw new ExpectedError(
      'CLI',
      `Resource "${resourceName}" is not a SQL database (type: ${resource.resourceType})`,
      'debug:sql supports relational-database resources only'
    );
  }

  // Get connection parameters from deployed resource
  const params = resource.referencableParams as Record<
    string,
    { value: unknown; ssmParameterName?: string } | undefined
  >;
  const host = params.host?.value as string;
  const port = params.port?.value as number;

  // Fetch connection string from SSM (contains credentials)
  const connectionStringSsmParam = params.connectionString?.ssmParameterName;
  if (!connectionStringSsmParam) {
    throw new ExpectedError(
      'CLI',
      'Could not find connection string SSM parameter',
      'Ensure the database is deployed and has a connectionString parameter'
    );
  }

  tuiManager.info(`Fetching connection string from SSM: ${connectionStringSsmParam}`);
  const connectionString = await locallyResolveSensitiveValue({ ssmParameterName: connectionStringSsmParam });

  if (!connectionString || connectionString === '<<UNABLE_TO_RESOLVE>>') {
    throw new ExpectedError(
      'CLI',
      'Could not fetch database connection string from SSM',
      'Ensure you have permission to read SSM parameters'
    );
  }

  // Parse connection string: postgresql://user:password@host:port/dbname
  const connStringMatch = connectionString.match(/^(postgresql|mysql):\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
  if (!connStringMatch) {
    throw new ExpectedError(
      'CLI',
      'Could not parse database connection string',
      `Connection string format not recognized: ${connectionString.substring(0, 30)}...`
    );
  }

  const [, protocol, username, password, _connHost, _connPort, dbName] = connStringMatch;
  const isPostgres = protocol === 'postgresql';

  if (!host || !port) {
    throw new ExpectedError(
      'CLI',
      'Could not retrieve database connection parameters',
      'Ensure the database is deployed and accessible'
    );
  }

  // Check if database is VPC-only (needs tunneling)
  // We detect this by trying to see if bastion tunneling targets exist
  let tunnels: SsmPortForwardingTunnel[] = [];
  let connectionHost = host;
  let connectionPort = port;

  // Try to establish tunnel if bastion is specified or if connection fails
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

  // Register cleanup hook for tunnels
  if (tunnels.length > 0) {
    applicationManager.registerCleanUpHook(async () => {
      await Promise.all(tunnels.map((t) => t.kill()));
    });
  }

  const conn: PostgresConnectionOpts = {
    host: connectionHost,
    port: connectionPort,
    user: username,
    password,
    database: dbName || 'defdb',
    // RDS requires SSL; use rejectUnauthorized: false for self-signed certs
    ssl: { rejectUnauthorized: false }
  };

  // Validate query is read-only
  const sqlLower = sql.toLowerCase().trim();
  const isReadOnly =
    sqlLower.startsWith('select') ||
    sqlLower.startsWith('show') ||
    sqlLower.startsWith('describe') ||
    sqlLower.startsWith('explain') ||
    sqlLower.startsWith('\\d'); // PostgreSQL meta-commands

  if (!isReadOnly) {
    throw new ExpectedError(
      'CLI',
      'debug:sql only supports read-only queries',
      'Use SELECT, SHOW, DESCRIBE, or EXPLAIN statements only'
    );
  }

  // Execute query based on engine type
  const queryFn = isPostgres ? postgresQuery : mysqlQuery;
  const result = await queryFn(conn, { sql, limit, timeout });

  // Close tunnels
  if (tunnels.length > 0) {
    await Promise.all(tunnels.map((t) => t.kill()));
  }

  if (!result.ok) {
    throw new ExpectedError(
      'CLI',
      `Query failed: ${(result as { error: string }).error}`,
      (result as { hint?: string }).hint
    );
  }

  // Output results
  if (isAgentMode()) {
    tuiManager.info(
      JSON.stringify(
        {
          ok: true,
          resource: resourceName,
          engine: isPostgres ? 'postgres' : 'mysql',
          sql,
          rows: result.rows,
          fields: result.fields,
          rowCount: result.rowCount,
          truncated: result.truncated
        },
        null,
        2
      )
    );
  } else {
    if (result.rowCount === 0) {
      tuiManager.info('No rows returned.');
    } else {
      tuiManager.info(`${result.rowCount} row(s) returned${result.truncated ? ` (truncated to ${limit})` : ''}:\n`);

      // Simple table output
      const { rows, fields } = result;
      const colWidths = fields.map((f) => Math.max(f.length, ...rows.map((r) => String(r[f] ?? '').length)));

      // Header
      const header = fields.map((f, i) => f.padEnd(colWidths[i])).join(' | ');
      const separator = colWidths.map((w) => '-'.repeat(w)).join('-+-');
      tuiManager.info(header);
      tuiManager.info(separator);

      // Rows
      for (const row of rows) {
        const line = fields.map((f, i) => String(row[f] ?? '').padEnd(colWidths[i])).join(' | ');
        tuiManager.info(line);
      }
    }
  }

  return null;
};
