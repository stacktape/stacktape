import type { Convex } from '@stacktape/config/convex';
import type { RelationalDatabase } from '@stacktape/config/relational-databases';

export type StpRelationalDatabase = RelationalDatabase['properties'] & {
  name: string;
  type: RelationalDatabase['type'];
  configParentResourceType: RelationalDatabase['type'] | Convex['type'];
  nameChain: string[];
};
export type RelationalDatabaseReferencableParam =
  | 'host'
  | 'hosts'
  | 'connectionString'
  | 'jdbcConnectionString'
  | 'port'
  | 'dbName'
  | 'readerHost'
  | 'readerPort'
  | 'readerConnectionString'
  | 'readerJdbcConnectionString'
  | 'readReplicaHosts'
  | 'readReplicaConnectionStrings'
  | 'readReplicaJdbcConnectionStrings'
  | `readReplica${number}Port`;
export type NormalizedSQLEngine = Exclude<
  StpRelationalDatabase['engine']['type'],
  | 'aurora-postgresql-serverless'
  | 'aurora-mysql-serverless'
  | 'aurora-postgresql-serverless-v2'
  | 'aurora-mysql-serverless-v2'
>;
