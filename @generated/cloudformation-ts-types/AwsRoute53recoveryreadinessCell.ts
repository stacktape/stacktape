// This file is auto-generated. Do not edit manually.
// Source: aws-route53recoveryreadiness-cell.json

/** The API Schema for AWS Route53 Recovery Readiness Cells. */
export type AwsRoute53recoveryreadinessCell = {
  /**
   * The name of the cell to create.
   * @maxLength 64
   * @pattern [a-zA-Z0-9_]+
   */
  CellName?: string;
  /**
   * The Amazon Resource Name (ARN) of the cell.
   * @maxLength 256
   */
  CellArn?: string;
  /**
   * A list of cell Amazon Resource Names (ARNs) contained within this cell, for use in nested cells.
   * For example, Availability Zones within specific Regions.
   * @maxItems 5
   */
  Cells?: string[];
  /**
   * The readiness scope for the cell, which can be a cell Amazon Resource Name (ARN) or a recovery
   * group ARN. This is a list but currently can have only one element.
   * @maxItems 5
   */
  ParentReadinessScopes?: string[];
  /** A collection of tags associated with a resource */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
