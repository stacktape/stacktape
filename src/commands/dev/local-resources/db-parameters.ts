import { globalStateManager } from '@application-services/global-state-manager';
import { DescribeEngineDefaultParametersCommand, RDSClient } from '@aws-sdk/client-rds';
import { configManager } from '@domain-services/config-manager';

type DbEngine = 'postgres' | 'mysql' | 'mariadb';

type DbParameterSet = Record<string, string>;

const engineVersionConfigurationData = [
  { family: 'aurora-mysql5.7', majorVersion: '5.7' },
  { family: 'aurora-mysql8.0', majorVersion: '8.0' },
  { family: 'aurora-postgresql10', majorVersion: '10' },
  { family: 'aurora-postgresql11', majorVersion: '11' },
  { family: 'aurora-postgresql12', majorVersion: '12' },
  { family: 'aurora-postgresql13', majorVersion: '13' },
  { family: 'aurora-postgresql14', majorVersion: '14' },
  { family: 'aurora-postgresql15', majorVersion: '15' },
  { family: 'aurora-postgresql16', majorVersion: '16' },
  { family: 'mariadb10.2', majorVersion: '10.2' },
  { family: 'mariadb10.3', majorVersion: '10.3' },
  { family: 'mariadb10.4', majorVersion: '10.4' },
  { family: 'mariadb10.5', majorVersion: '10.5' },
  { family: 'mariadb10.6', majorVersion: '10.6' },
  { family: 'mariadb10.11', majorVersion: '10.11' },
  { family: 'mariadb11.4', majorVersion: '11.4' },
  { family: 'mysql5.6', majorVersion: '5.6' },
  { family: 'mysql5.7', majorVersion: '5.7' },
  { family: 'mysql8.0', majorVersion: '8.0' },
  { family: 'mysql8.4', majorVersion: '8.4' },
  { family: 'postgres10', majorVersion: '10' },
  { family: 'postgres11', majorVersion: '11' },
  { family: 'postgres12', majorVersion: '12' },
  { family: 'postgres13', majorVersion: '13' },
  { family: 'postgres14', majorVersion: '14' },
  { family: 'postgres15', majorVersion: '15' },
  { family: 'postgres16', majorVersion: '16' },
  { family: 'postgres17', majorVersion: '17' },
  { family: 'postgres18', majorVersion: '18' }
];

const normalizeEngineType = (engineType: string): string => {
  return engineType.replace('-serverless-v2', '').replace('-serverless', '');
};

const getParameterGroupFamily = (engineType: string, version: string): string | null => {
  const normalizedEngine = normalizeEngineType(engineType);
  const majorVersion = version
    .split('.')
    .slice(0, normalizedEngine === 'mariadb' ? 2 : 1)
    .join('.');

  const match = engineVersionConfigurationData.find(
    ({ family, majorVersion: mv }) => family.startsWith(normalizedEngine) && mv === majorVersion
  );

  return match?.family || null;
};

const getStacktapeLoggingParameters = (resource: {
  engine: { type: string };
  logging?: { engineSpecificOptions?: Record<string, any> };
}): DbParameterSet => {
  const normalizedEngine = normalizeEngineType(resource.engine.type);
  const params: DbParameterSet = {};

  if (normalizedEngine === 'aurora-postgresql' || normalizedEngine === 'postgres') {
    const opts = resource.logging?.engineSpecificOptions as
      | {
          log_connections?: boolean;
          log_disconnections?: boolean;
          log_lock_waits?: boolean;
          log_min_duration_statement?: number;
          log_statement?: string;
        }
      | undefined;

    params.log_connections = opts?.log_connections ? 'on' : 'off';
    params.log_disconnections = opts?.log_disconnections ? 'on' : 'off';
    params.log_lock_waits = opts?.log_lock_waits ? 'on' : 'off';
    params.log_min_duration_statement =
      opts?.log_min_duration_statement !== undefined ? String(opts.log_min_duration_statement) : '10000';
    params.log_statement = opts?.log_statement || 'ddl';
  }

  if (normalizedEngine === 'aurora-mysql' || normalizedEngine === 'mysql' || normalizedEngine === 'mariadb') {
    const opts = resource.logging?.engineSpecificOptions as
      | {
          long_query_time?: number;
        }
      | undefined;

    params.log_output = 'FILE';
    params.general_log = '0';
    params.slow_query_log = opts?.long_query_time === -1 ? '0' : '1';
    params.long_query_time = opts?.long_query_time !== undefined ? String(opts.long_query_time) : '10';
  }

  return params;
};

const getUserOverrideParameters = (resource: { overrides?: Record<string, Record<string, any>> }): DbParameterSet => {
  const params: DbParameterSet = {};

  if (!resource.overrides) return params;

  // Look for parameter group overrides in the overrides object
  // The key format is typically: <ResourceName>AwsRdsDbParameterGroup
  for (const [key, overrides] of Object.entries(resource.overrides)) {
    if (key.includes('ParameterGroup') && (overrides as Record<string, any>).Parameters) {
      Object.assign(params, (overrides as Record<string, any>).Parameters);
    }
  }

  return params;
};

// Parameters that can be safely applied to local Docker containers
// Some AWS-specific parameters don't make sense locally
const APPLICABLE_POSTGRES_PARAMS = new Set([
  'log_connections',
  'log_disconnections',
  'log_lock_waits',
  'log_min_duration_statement',
  'log_statement',
  'max_connections',
  'shared_buffers',
  'work_mem',
  'maintenance_work_mem',
  'effective_cache_size',
  'random_page_cost',
  'seq_page_cost',
  'default_statistics_target',
  'checkpoint_completion_target',
  'wal_buffers',
  'min_wal_size',
  'max_wal_size',
  'statement_timeout',
  'lock_timeout',
  'idle_in_transaction_session_timeout',
  'timezone',
  'lc_messages',
  'log_timezone',
  'datestyle',
  'intervalstyle',
  'client_encoding',
  'standard_conforming_strings',
  'search_path'
]);

const APPLICABLE_MYSQL_PARAMS = new Set([
  'log_output',
  'general_log',
  'slow_query_log',
  'long_query_time',
  'max_connections',
  'innodb_buffer_pool_size',
  'innodb_log_file_size',
  'innodb_flush_log_at_trx_commit',
  'innodb_file_per_table',
  'query_cache_size',
  'query_cache_type',
  'table_open_cache',
  'tmp_table_size',
  'max_heap_table_size',
  'thread_cache_size',
  'wait_timeout',
  'interactive_timeout',
  'net_read_timeout',
  'net_write_timeout',
  'lock_wait_timeout',
  'character_set_server',
  'collation_server',
  'sql_mode',
  'time_zone'
]);

const filterApplicableParams = (params: DbParameterSet, engine: DbEngine): DbParameterSet => {
  const applicable = engine === 'postgres' ? APPLICABLE_POSTGRES_PARAMS : APPLICABLE_MYSQL_PARAMS;
  const filtered: DbParameterSet = {};

  for (const [key, value] of Object.entries(params)) {
    if (applicable.has(key) && value !== undefined && value !== '') {
      filtered[key] = value;
    }
  }

  return filtered;
};

export const fetchAwsDefaultParameters = async (parameterGroupFamily: string): Promise<DbParameterSet> => {
  const params: DbParameterSet = {};

  try {
    const client = new RDSClient({ region: globalStateManager.region });
    let marker: string | undefined;

    do {
      const response = await client.send(
        new DescribeEngineDefaultParametersCommand({
          DBParameterGroupFamily: parameterGroupFamily,
          Marker: marker
        })
      );

      for (const param of response.EngineDefaults?.Parameters || []) {
        if (param.ParameterName && param.ParameterValue !== undefined) {
          params[param.ParameterName] = param.ParameterValue;
        }
      }

      marker = response.EngineDefaults?.Marker;
    } while (marker);
  } catch (error) {
    // If we can't fetch AWS defaults, continue without them
    console.warn(`Could not fetch AWS default parameters for ${parameterGroupFamily}: ${error.message}`);
  }

  return params;
};

// Cache for AWS default parameters to avoid repeated API calls
const awsDefaultParamsCache = new Map<string, DbParameterSet>();

export const getLocalDbParameters = async ({
  resourceName,
  engine,
  version,
  skipAwsDefaults = false
}: {
  resourceName: string;
  engine: DbEngine;
  version: string;
  skipAwsDefaults?: boolean;
}): Promise<DbParameterSet> => {
  const db = configManager.databases?.find((r) => r.name === resourceName);
  if (!db) return {};

  const paramGroupFamily = getParameterGroupFamily(db.engine.type, version);

  // 1. Start with AWS defaults (if we can fetch them and not skipped)
  let mergedParams: DbParameterSet = {};
  if (paramGroupFamily && !skipAwsDefaults) {
    // Check cache first
    if (awsDefaultParamsCache.has(paramGroupFamily)) {
      mergedParams = { ...awsDefaultParamsCache.get(paramGroupFamily)! };
    } else {
      mergedParams = await fetchAwsDefaultParameters(paramGroupFamily);
      awsDefaultParamsCache.set(paramGroupFamily, mergedParams);
    }
  }

  // 2. Apply Stacktape logging parameters
  const stpParams = getStacktapeLoggingParameters(db);
  Object.assign(mergedParams, stpParams);

  // 3. Apply user overrides
  const userOverrides = getUserOverrideParameters(db as any);
  Object.assign(mergedParams, userOverrides);

  // 4. Filter to only applicable params for Docker
  return filterApplicableParams(mergedParams, engine);
};

export const postgresParamsToDockerArgs = (params: DbParameterSet): string[] => {
  const args: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    // Skip empty values and AWS-specific dynamic expressions
    if (!value || value.includes('{') || value.includes('}')) continue;
    args.push('-c', `${key}=${value}`);
  }

  return args;
};

export const mysqlParamsToDockerArgs = (params: DbParameterSet): string[] => {
  const args: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    // Skip empty values and AWS-specific dynamic expressions
    if (!value || value.includes('{') || value.includes('}')) continue;
    // MySQL uses --param-name=value format (with dashes instead of underscores)
    const paramName = key.replace(/_/g, '-');
    args.push(`--${paramName}=${value}`);
  }

  return args;
};
