import type { StacktapeCliArgs } from 'src/config/cli/types';
import { applicationManager } from '@application-services/application-manager';
import { tuiManager } from '@application-services/tui-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { postgresQuery, mysqlQuery, type PostgresConnectionOpts } from '@domain-services/debug-services/db-client';
import { startPortForwardingSessions, type SsmPortForwardingTunnel } from '@utils/ssm-session';
import { locallyResolveSensitiveValue } from '@utils/stack-info-map-sensitive-values';
import { CliError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';
import { isDefinitelyReadOnlySql } from '../_utils/read-only-diagnostics';

const SUPPORTED_DB_TYPES = ['relational-database'] as const;

export const parseSqlConnectionString = ({ connectionString }: { connectionString: string }) => {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    // Do not retain the parser error as a cause: URL parser errors can include the credential-bearing input.
    throw new CliError({
      category: 'CLI',
      code: 'CLI_SQL_CONNECTION_STRING_INVALID',
      message: 'Could not parse the database connection string.'
    });
  }

  const protocol = url.protocol.replace(':', '');
  if (protocol !== 'postgresql' && protocol !== 'mysql') {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_SQL_PROTOCOL_UNSUPPORTED',
      message: `Unsupported SQL protocol \`${protocol}\` in the database connection string.`
    });
  }

  let username: string;
  let password: string;
  let database: string;
  try {
    username = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
    database = decodeURIComponent(url.pathname.replace(/^\//, '') || 'defdb');
  } catch {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_SQL_CONNECTION_STRING_INVALID',
      message: 'The database connection string contains invalid percent-encoding.'
    });
  }
  const host = url.hostname;
  const port = Number(url.port || (protocol === 'postgresql' ? 5432 : 3306));

  if (!username || !password || !host || !port) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_SQL_CONNECTION_STRING_INCOMPLETE',
      message: 'The database connection string does not contain complete credentials.'
    });
  }

  return { protocol, username, password, host, port, database };
};

export const assertReadOnlySql = ({ sql }: { sql: string }) => {
  if (!isDefinitelyReadOnlySql(sql)) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_SQL_QUERY_NOT_READ_ONLY',
      message: '`query:sql` only supports read-only queries.',
      hints: 'Use `SELECT`, `WITH`, `VALUES`, `SHOW`, `DESCRIBE`, or `EXPLAIN` statements only.'
    });
  }
};

export const commandQuerySql = async () => {
  const { args: capturedArgs } = await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: false,
    commandRequiresConfig: false
  });

  const args = capturedArgs as StacktapeCliArgs & {
    sql?: string;
    limit?: number;
    timeout?: number;
  };

  const { resourceName, bastionResource, sql, limit = 1000, timeout = 30000 } = args;

  if (!resourceName) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_SQL_RESOURCE_REQUIRED',
      message: 'Missing required flag `--resourceName`.',
      hints: 'Provide `--resourceName <databaseName>`.'
    });
  }

  if (!sql) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_SQL_QUERY_REQUIRED',
      message: 'Missing required flag `--sql`.',
      hints: 'For example, provide `--sql "SELECT * FROM table LIMIT 10"`.'
    });
  }

  // Get resource info
  const resource = deployedStackOverviewManager.getStpResource({ nameChain: resourceName });
  if (!resource) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_SQL_RESOURCE_NOT_FOUND',
      message: `Resource \`${resourceName}\` does not exist in the deployed stack.`
    });
  }

  if (!SUPPORTED_DB_TYPES.includes(resource.resourceType as (typeof SUPPORTED_DB_TYPES)[number])) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_SQL_RESOURCE_TYPE_INVALID',
      message: `Resource \`${resourceName}\` is not a SQL database (type: \`${resource.resourceType}\`).`,
      hints: '`query:sql` supports `relational-database` resources only.'
    });
  }

  // Get connection parameters from deployed resource
  const params = resource.referencableParams as Record<
    string,
    { value: unknown; ssmParameterName?: string } | undefined
  >;

  const readerConnectionStringSsmParam = params.readerConnectionString?.ssmParameterName;
  const primaryConnectionStringSsmParam = params.connectionString?.ssmParameterName;
  const shouldUseReaderEndpoint = !!readerConnectionStringSsmParam;
  const connectionStringSsmParam = readerConnectionStringSsmParam || primaryConnectionStringSsmParam;

  // Fetch connection string from SSM (contains credentials)
  if (!connectionStringSsmParam) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_SQL_CONNECTION_PARAMETER_MISSING',
      message: 'Could not find the database connection-string SSM parameter.',
      hints: 'Ensure the database is deployed and exposes a `connectionString` parameter.'
    });
  }

  tuiManager.info(`Fetching connection string from SSM: ${connectionStringSsmParam}`);
  const connectionString = await locallyResolveSensitiveValue({ ssmParameterName: connectionStringSsmParam });

  if (!connectionString || connectionString === '<<UNABLE_TO_RESOLVE>>') {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_SQL_CONNECTION_PARAMETER_UNAVAILABLE',
      message: 'Could not fetch the database connection string from SSM.',
      hints: 'Ensure your AWS identity can read the relevant SSM parameter.'
    });
  }

  const {
    protocol,
    username,
    password,
    host: parsedHost,
    port: parsedPort,
    database
  } = parseSqlConnectionString({
    connectionString
  });
  const isPostgres = protocol === 'postgresql';

  // Check if database is VPC-only (needs tunneling)
  // We detect this by trying to see if bastion tunneling targets exist
  let tunnels: SsmPortForwardingTunnel[] = [];
  let connectionHost = parsedHost;
  let connectionPort = parsedPort;

  // Try to establish tunnel if bastion is specified or if connection fails
  if (bastionResource) {
    const allTargets = deployedStackOverviewManager.resolveBastionTunnelsForTarget({
      targetStpName: resourceName,
      bastionStpName: bastionResource
    });

    const targetLabel = shouldUseReaderEndpoint ? 'reader' : 'primary';
    const selectedTarget = allTargets.find(({ label }) => label === targetLabel) || allTargets[0];

    if (selectedTarget) {
      tunnels = await startPortForwardingSessions({ targets: [selectedTarget] });
      connectionHost = '127.0.0.1';
      connectionPort = tunnels[0].localPort;
      tuiManager.info(
        `Tunnel established: localhost:${connectionPort} -> ${selectedTarget.remoteHost}:${selectedTarget.remotePort}`
      );
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
    database,
    // RDS requires SSL; use rejectUnauthorized: false for self-signed certs
    ssl: { rejectUnauthorized: false }
  };

  assertReadOnlySql({ sql });

  let result: Awaited<ReturnType<typeof postgresQuery>>;
  try {
    const queryFn = isPostgres ? postgresQuery : mysqlQuery;
    result = await queryFn(conn, { sql, limit, timeout, readOnly: true });
  } finally {
    if (tunnels.length > 0) {
      await Promise.all(tunnels.map((t) => t.kill()));
    }
  }

  if (!result.ok) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_SQL_QUERY_FAILED',
      message: `Query failed: ${(result as { error: string }).error}`,
      hints: (result as { hint?: string }).hint
    });
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
