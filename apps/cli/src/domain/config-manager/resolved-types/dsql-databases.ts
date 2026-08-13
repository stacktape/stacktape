import type { DsqlDatabase } from '@stacktape/config/dsql-databases';

export type StpDsqlDatabase = DsqlDatabase['properties'] & {
  name: string;
  type: DsqlDatabase['type'];
  configParentResourceType: DsqlDatabase['type'];
  nameChain: string[];
};

export type DsqlDatabaseReferencableParam = 'endpoint' | 'port' | 'databaseName' | 'username' | 'region' | 'id' | 'arn';
