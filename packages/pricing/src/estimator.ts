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
    /** Subtotal of the fixed monthly prices available in USD. */
    totalMonthlyFlat: number;
    /** A fixed monthly product has no usable regional price. */
    incomplete: boolean;
    costBreakdown: ProductCostInformation[];
  };
  relatedAwsPricingDocs?: Record<string, string>;
  underTheHoodLink?: string;
  customComment?: string;
};

export type StackPricingEstimate = {
  /** Subtotal; display as a monthly estimate only when incomplete is false. */
  flatMonthlyCost: number;
  incomplete: boolean;
  /** Resources unsupported by the estimator or whose lookup failed. */
  unpricedResources: string[];
  resourcesBreakdown: Record<string, ResourcePricingInformation>;
};

export const getCumulatedPriceInfoForStack = (options: {
  stackConfig: StacktapeConfig;
  region?: string;
  dynamoDbTableName: string;
}): Promise<StackPricingEstimate> => getCumulatedPriceInfoForStackInternal(options);
