import type { NormalizedSQLEngine } from './resolved-types/relational-databases';
import { normalizeEngineType } from '@stacktape/config/relational-database-engines';
import { ExpectedError } from '@utils/errors';
import type { StpRelationalDatabase } from './resolved-types/relational-databases';
import type { AuroraEngine, RdsEngine } from '@stacktape/config/relational-databases';
const defaultEnginePorts: {
  [_engineType in StpRelationalDatabase['engine']['type']]: number;
} = {
  'aurora-mysql-serverless': 3306,
  'aurora-postgresql-serverless': 5432,
  'aurora-mysql-serverless-v2': 3306,
  'aurora-postgresql-serverless-v2': 5432,
  'aurora-postgresql': 5432,
  'aurora-mysql': 3306,
  mariadb: 3306,
  mysql: 3306,
  'oracle-ee': 1521,
  'oracle-se2': 1521,
  postgres: 5432,
  'sqlserver-ee': 1433,
  'sqlserver-ex': 1433,
  'sqlserver-se': 1433,
  'sqlserver-web': 1433
};

export const resolveDatabasePort = ({ definition }: { definition: StpRelationalDatabase }) => {
  const engineProperties = definition.engine.properties as AuroraEngine['properties'] | RdsEngine['properties'];
  if (engineProperties?.port) {
    return engineProperties.port;
  }
  return defaultEnginePorts[definition.engine.type];
};

const rdsLogTypes: {
  [_engineType in NormalizedSQLEngine]: { allowedTypes: string[]; defaultTypes: string[] };
} = {
  'aurora-postgresql': { allowedTypes: ['postgresql'], defaultTypes: ['postgresql'] },
  'aurora-mysql': {
    allowedTypes: ['audit', 'error', 'general', 'slowquery'],
    defaultTypes: ['audit', 'error', 'slowquery']
  },
  mariadb: { allowedTypes: ['audit', 'error', 'general', 'slowquery'], defaultTypes: ['audit', 'error', 'slowquery'] },
  mysql: { allowedTypes: ['audit', 'error', 'general', 'slowquery'], defaultTypes: ['audit', 'error', 'slowquery'] },
  'oracle-ee': { allowedTypes: ['alert', 'audit', 'listener', 'trace'], defaultTypes: ['alert', 'listener'] },
  'oracle-se2': { allowedTypes: ['alert', 'audit', 'listener', 'trace'], defaultTypes: ['alert', 'listener'] },
  postgres: { allowedTypes: ['postgresql', 'upgrade'], defaultTypes: ['postgresql'] },
  'sqlserver-ee': { allowedTypes: ['agent', 'error'], defaultTypes: ['agent', 'error'] },
  'sqlserver-ex': { allowedTypes: ['error'], defaultTypes: ['error'] },
  'sqlserver-se': { allowedTypes: ['agent', 'error'], defaultTypes: ['agent', 'error'] },
  'sqlserver-web': { allowedTypes: ['agent', 'error'], defaultTypes: ['agent', 'error'] }
};

export const resolveCloudwatchLogExports = ({ resource }: { resource: StpRelationalDatabase }): string[] => {
  const engineType = normalizeEngineType(resource.engine.type);

  if (resource.logging?.disabled) {
    return [];
  }
  const exportLogs = resource.logging?.logTypes || rdsLogTypes[engineType].defaultTypes;

  const invalidLogType = exportLogs.find((logType) => !rdsLogTypes[engineType].allowedTypes.includes(logType));
  if (invalidLogType) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in ${resource.type} "${resource.name}". Using log type ${invalidLogType} is invalid for the engine ${resource.engine.type}`
    );
  }

  return exportLogs;
};
