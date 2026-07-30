import type { RelationalDatabaseProps } from './relational-databases';

export type RelationalDatabaseEngine = RelationalDatabaseProps['engine']['type'];

export type NormalizedRelationalDatabaseEngine = Exclude<
  RelationalDatabaseEngine,
  | 'aurora-postgresql-serverless'
  | 'aurora-mysql-serverless'
  | 'aurora-postgresql-serverless-v2'
  | 'aurora-mysql-serverless-v2'
>;

export const normalizeEngineType = (
  engineType: RelationalDatabaseEngine
): NormalizedRelationalDatabaseEngine => {
  if (engineType.startsWith('aurora')) {
    return engineType.startsWith('aurora-postgresql') ? 'aurora-postgresql' : 'aurora-mysql';
  }
  return engineType as NormalizedRelationalDatabaseEngine;
};
