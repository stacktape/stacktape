import type { StpRelationalDatabase } from '@domain-services/config-manager/resolved-types/relational-databases';
export const isAuroraEngine = (engineType: StpRelationalDatabase['engine']['type']) => {
  return (
    engineType === 'aurora-mysql' ||
    engineType === 'aurora-postgresql' ||
    engineType === 'aurora-mysql-serverless' ||
    engineType === 'aurora-postgresql-serverless' ||
    engineType === 'aurora-mysql-serverless-v2' ||
    engineType === 'aurora-postgresql-serverless-v2'
  );
};
