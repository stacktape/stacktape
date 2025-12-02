// This file is auto-generated. Do not edit manually.
// Source: aws-securityhub-aggregatorv2.json

/**
 * The AWS::SecurityHub::AggregatorV2 resource represents the AWS Security Hub AggregatorV2 in your
 * account. One aggregatorv2 resource is created for each account in non opt-in region in which you
 * configure region linking mode.
 */
export type AwsSecurityhubAggregatorv2 = {
  /**
   * The ARN of the AggregatorV2 being created and assigned as the unique identifier
   * @pattern arn:aws\S*:securityhub:\S*
   */
  AggregatorV2Arn?: string;
  /**
   * Indicates to link a list of included Regions
   * @enum ["SPECIFIED_REGIONS"]
   */
  RegionLinkingMode: "SPECIFIED_REGIONS";
  /**
   * The list of included Regions
   * @minItems 1
   * @maxItems 50
   * @uniqueItems true
   */
  LinkedRegions: string[];
  Tags?: Record<string, string>;
  /** The aggregation Region of the AggregatorV2 */
  AggregationRegion?: string;
};
