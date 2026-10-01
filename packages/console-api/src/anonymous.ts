import { z } from 'zod';

/**
 * The Console API's anonymous surface: procedures that accept a request with no credentials at all.
 *
 * Everything here is reachable by anyone on the internet, so the contract is deliberately narrow — it
 * describes only the procedures a Stacktape client is expected to call. The Console's own unauthenticated
 * procedures that no public client uses are not part of it.
 */

const COGNITO_ID_TOKEN_MAX_LENGTH = 8192;

export const exchangeTokenForApiKeyInputSchema = z.object({
  idToken: z.string().max(COGNITO_ID_TOKEN_MAX_LENGTH),
  organizationId: z.string().optional(),
  listOrganizationsOnly: z.boolean().optional()
});

export const stackPriceEstimationInputSchema = z.object({
  stackConfig: z.string(),
  region: z.string().optional()
});

export type ExchangeTokenForApiKeyInput = z.input<typeof exchangeTokenForApiKeyInputSchema>;
export type StackPriceEstimationInput = z.input<typeof stackPriceEstimationInputSchema>;

export type ExchangeTokenForApiKeyResponse = {
  success: boolean;
  /** Absent when the exchange failed, and empty when only the organization list was requested. */
  apiKeys?: {
    id: string;
    createdAt: string;
    updatedAt: string;
    /** Null until the key is first used. */
    lastUsed: string | null;
    name: string;
    userId: string;
    organizationId: string | null;
    organizationName: string;
  }[];
  organizations?: {
    id: string;
    name: string;
  }[];
  error?: string;
};

export type CostBreakdownItem = {
  name: string;
  description: string;
  /** `flat` or `pay-per-use` today; new estimator entries may add further models. */
  priceModel: string;
  pricePerUnit?: number;
  unit?: string;
  adjustedPrice?: number;
  pricePerMonth?: number | false;
  pricePerMonthUpper?: number | false;
  multiplier?: number;
  upperThresholdMultiplier?: number;
  unsupportedProduct?: boolean;
  [otherProperties: string]: unknown;
};

export type ResourcePricingInfo = {
  priceInfo: {
    /** Absent for resources whose price the estimator could not total. */
    totalMonthlyFlat?: number;
    costBreakdown: CostBreakdownItem[];
  };
  relatedAwsPricingDocs?: Record<string, string>;
  underTheHoodLink?: string;
  customComment?: string;
};

export type StackPriceEstimationResponse = {
  success: boolean;
  costs: {
    flatMonthlyCost: number;
    resourcesBreakdown: Record<string, ResourcePricingInfo>;
  } | null;
};

/** The procedures an anonymous Stacktape client may call, and nothing else. */
export type AnonymousTrpcClient = {
  exchangeTokenForApiKey: {
    mutate: (input: ExchangeTokenForApiKeyInput) => Promise<ExchangeTokenForApiKeyResponse>;
  };
  stackPriceEstimation: {
    mutate: (input: StackPriceEstimationInput) => Promise<StackPriceEstimationResponse>;
  };
};
