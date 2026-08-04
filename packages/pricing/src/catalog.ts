import {
  calculateFlatMonthlyCost as calculateFlatMonthlyCostInternal,
  downloadSimplePricingInfo as downloadSimplePricingInfoInternal
} from './internal/pricing';

export type AwsServiceCsvOfferCode =
  | 'AmazonECS'
  | 'AmazonElastiCache'
  | 'AmazonEC2'
  | 'AmazonRDS'
  | 'AmazonES'
  | 'AmazonS3'
  | 'AmazonDynamoDB'
  | 'AmazonApiGateway'
  | 'AWSLambda'
  | 'awswaf'
  | 'AWSEvents'
  | 'AmazonCloudFront'
  | 'AmazonEFS';

export type RegionalPricingInfo = {
  unit: string;
  pricePerUnit: string;
  currency: string;
  ADDITIONAL_METADATA?: {
    vCpu?: string;
    memory?: string;
    burstable?: boolean;
    cpuArchitecture?: 'ARM' | 'x86';
  };
};

export type PricingInfo = Record<string, Record<string, RegionalPricingInfo>>;

export const downloadSimplePricingInfo = (options: {
  downloadDirectory: string;
  awsServiceOfferCode: AwsServiceCsvOfferCode;
}): Promise<PricingInfo> => downloadSimplePricingInfoInternal(options);

export const calculateFlatMonthlyCost = (regionalPricing: RegionalPricingInfo): number =>
  calculateFlatMonthlyCostInternal(regionalPricing);
