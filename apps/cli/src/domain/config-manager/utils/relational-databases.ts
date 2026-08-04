import type {
  NormalizedSQLEngine,
  StpRelationalDatabase
} from '@domain-services/config-manager/resolved-types/relational-databases';
import type { StpWorkloadType } from '@domain-services/config-manager/resolved-types/resources';
import { resolveCloudwatchLogExports } from '@domain-services/calculated-stack-overview-manager/resource-resolvers/databases/utils';
import { normalizeEngineType } from '@stacktape/config/relational-database-engines';
import { CliError } from '@utils/errors';
import { getPropsOfResourceReferencedInConfig } from './resource-references';
import type { MysqlLoggingOptions, PostgresLoggingOptions } from '@stacktape/config/relational-databases';
import { configErrors } from '../errors';

export const resolveReferenceToRelationalDatabase = ({
  referencedFrom,
  referencedFromType,
  stpResourceReference
}: {
  referencedFrom: string;
  referencedFromType?: StpWorkloadType | 'alarm';
  stpResourceReference: string;
}) => {
  return getPropsOfResourceReferencedInConfig({
    stpResourceReference,
    stpResourceType: 'relational-database',
    referencedFrom,
    referencedFromType
  });
};

const validEngineSpecificLogOptions: {
  [_engineType in NormalizedSQLEngine]: (keyof PostgresLoggingOptions | keyof MysqlLoggingOptions)[];
} = {
  'aurora-mysql': ['long_query_time', 'server_audit_events'],
  mariadb: ['long_query_time', 'server_audit_events'],
  mysql: ['long_query_time', 'server_audit_events'],
  'aurora-postgresql': [
    'log_connections',
    'log_disconnections',
    'log_lock_waits',
    'log_min_duration_statement',
    'log_statement'
  ],
  postgres: ['log_connections', 'log_disconnections', 'log_lock_waits', 'log_min_duration_statement', 'log_statement'],
  'oracle-ee': [],
  'oracle-se2': [],
  'sqlserver-ee': [],
  'sqlserver-ex': [],
  'sqlserver-se': [],
  'sqlserver-web': []
};

const validateLogOptions = ({ resource }: { resource: StpRelationalDatabase }) => {
  const logExports = resolveCloudwatchLogExports({ resource });
  if (resource.engine.type === 'aurora-mysql-serverless' && !logExports.includes('error')) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_DATABASE_REQUIRED_LOG_DISABLED',
      message: `Database \`${resource.name}\` cannot disable the \`error\` log when using engine \`${resource.engine.type}\`.`
    });
  }
  if (resource.engine.type === 'aurora-postgresql-serverless' && !logExports.includes('postgresql')) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_DATABASE_REQUIRED_LOG_DISABLED',
      message: `Database \`${resource.name}\` cannot disable the \`postgresql\` log when using engine \`${resource.engine.type}\`.`
    });
  }

  const validOptions = validEngineSpecificLogOptions[normalizeEngineType(resource.engine.type)];
  if (resource.logging?.engineSpecificOptions) {
    const invalidOption = Object.keys(resource.logging.engineSpecificOptions).find(
      (option) => !validOptions.includes(option as any)
    );
    if (invalidOption) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_DATABASE_LOG_OPTION_UNSUPPORTED',
        message: `Logging option \`${invalidOption}\` is not supported by engine \`${resource.engine.type}\` on database \`${resource.name}\`.`
      });
    }
  }
};

const validateAuroraServerlessV2ReadersCount = ({ resource }: { resource: StpRelationalDatabase }) => {
  if (
    resource.engine.type !== 'aurora-mysql-serverless-v2' &&
    resource.engine.type !== 'aurora-postgresql-serverless-v2'
  ) {
    return;
  }

  const serverlessReadersCount = resource.engine.properties.serverlessReadersCount;
  if (serverlessReadersCount === undefined) {
    return;
  }

  if (!Number.isInteger(serverlessReadersCount) || serverlessReadersCount < 0) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_DATABASE_SERVERLESS_READERS_INVALID',
      message: `\`serverlessReadersCount\` must be a non-negative integer for database \`${resource.name}\` using engine \`${resource.engine.type}\`.`
    });
  }
};

const isDayTimeStringValid = (dayTimeString: string): boolean => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const pattern = /^([A-Z]{3}):(\d{2}):(\d{2})$/i;

  const match = dayTimeString.match(pattern);

  if (!match) {
    return false; // Format doesn't match
  }

  const dayAbbr = match[1];
  const hours = Number.parseInt(match[2], 10);
  const minutes = Number.parseInt(match[3], 10);

  if (!days.includes(dayAbbr)) {
    return false; // Invalid day abbreviation
  }

  if (hours < 0 || hours > 23) {
    return false; // Invalid hours
  }

  if (minutes < 0 || minutes > 59) {
    return false; // Invalid minutes
  }

  return true;
};

export const isValidDayTimeStringRange = (rangeString: string): boolean => {
  const parts = rangeString.split('-');
  if (parts.length !== 2) {
    return false; // Must have exactly two parts separated by a hyphen
  }

  const [startTimeString, endTimeString] = parts;

  if (!isDayTimeStringValid(startTimeString) || !isDayTimeStringValid(endTimeString)) {
    return false; // Either start or end time string is invalid
  }

  // Optional: Add logic here to ensure startTime is before endTime if needed,
  // though the current request is just for format validation.

  return true;
};

export const validateRelationalDatabaseConfig = ({ resource }: { resource: StpRelationalDatabase }) => {
  if (resource.preferredMaintenanceWindow && !isValidDayTimeStringRange(resource.preferredMaintenanceWindow)) {
    throw configErrors.rdsMaintenanceWindowInvalid({ stpResourceName: resource.name });
  }
  validateAuroraServerlessV2ReadersCount({ resource });
  validateLogOptions({ resource });
};
