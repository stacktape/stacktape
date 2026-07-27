// This file is auto-generated. Do not edit manually.
// Source: aws-batch-consumableresource.json

/** Resource Type definition for AWS::Batch::ConsumableResource */
export type AwsBatchConsumableresource = {
  /**
   * Name of ConsumableResource.
   * @pattern 
   */
  ConsumableResourceName?: string;
  ConsumableResourceArn?: string;
  /** Total Quantity of ConsumableResource. */
  TotalQuantity: number;
  /** In-use Quantity of ConsumableResource. */
  InUseQuantity?: number;
  /** Available Quantity of ConsumableResource. */
  AvailableQuantity?: number;
  ResourceType: "REPLENISHABLE" | "NON_REPLENISHABLE";
  CreatedAt?: number;
  /** A key-value pair to associate with a resource. */
  Tags?: Record<string, string>;
};
