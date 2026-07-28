import type { Convex } from '@stacktape/config/convex';
import type { RelationalDatabase } from '@stacktape/config/relational-databases';

declare global {
type StpRelationalDatabase = RelationalDatabase['properties'] & {
  name: string;
  type: RelationalDatabase['type'];
  configParentResourceType: RelationalDatabase['type'] | Convex['type'];
  nameChain: string[];
};
type RelationalDatabaseReferencableParam =
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
type NormalizedSQLEngine = Exclude<
  StpRelationalDatabase['engine']['type'],
  | 'aurora-postgresql-serverless'
  | 'aurora-mysql-serverless'
  | 'aurora-postgresql-serverless-v2'
  | 'aurora-mysql-serverless-v2'
>;
}
