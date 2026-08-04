import { refreshPricingTable as refreshPricingTableInternal } from './internal/pricing';

export const refreshPricingTable = (options: { dynamoDbTableName: string; downloadDirectory: string }): Promise<void> =>
  refreshPricingTableInternal(options);
