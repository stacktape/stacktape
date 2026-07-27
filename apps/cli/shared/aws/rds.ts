export const normalizeEngineType = (engineType: StpRelationalDatabase['engine']['type']): NormalizedSQLEngine => {
  if (engineType.startsWith('aurora')) {
    return engineType.startsWith('aurora-postgresql') ? 'aurora-postgresql' : 'aurora-mysql';
  }
  return engineType as NormalizedSQLEngine;
};
