import type { StacktapeConfig } from '@stacktape/config';
import { getCumulatedPriceInfoForStack as getCumulatedPriceInfoForStackInternal } from './internal/pricing';

export type ProductCostInformation = {
  name: string;
  description: string;
  priceModel: string;
  unsupportedProduct?: boolean;
  pricePerUnit?: number;
  unit?: string;
  adjustedPrice?: number;
  pricePerMonth?: number | false;
  pricePerMonthUpper?: number | false;
  ADDITIONAL_METADATA?: {
    vCpu?: string;
    memory?: string;
    burstable?: boolean;
    cpuArchitecture?: 'ARM' | 'x86';
  };
};

export type ResourcePricingInformation = {
  priceInfo: {
    totalMonthlyFlat: number;
    costBreakdown: ProductCostInformation[];
  };
  relatedAwsPricingDocs?: Record<string, string>;
  underTheHoodLink?: string;
  customComment?: string;
};

export type StackPricingEstimate = {
  flatMonthlyCost: number;
  resourcesBreakdown: Record<string, ResourcePricingInformation>;
};

export const getCumulatedPriceInfoForStack = (options: {
  stackConfig: StacktapeConfig;
  region?: string;
  dynamoDbTableName: string;
}): Promise<StackPricingEstimate> => getCumulatedPriceInfoForStackInternal(options);
