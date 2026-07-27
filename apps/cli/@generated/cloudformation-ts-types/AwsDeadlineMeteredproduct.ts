// This file is auto-generated. Do not edit manually.
// Source: aws-deadline-meteredproduct.json

/** Definition of AWS::Deadline::MeteredProduct Resource Type */
export type AwsDeadlineMeteredproduct = {
  /** @pattern ^le-[0-9a-f]{32}$ */
  LicenseEndpointId?: string;
  /** @pattern ^[0-9a-z]{1,32}-[.0-9a-z]{1,32}$ */
  ProductId?: string;
  /**
   * @minimum 1024
   * @maximum 65535
   */
  Port?: number;
  /**
   * @minLength 1
   * @maxLength 64
   */
  Family?: string;
  /**
   * @minLength 1
   * @maxLength 64
   */
  Vendor?: string;
  /** @pattern ^arn:(aws[a-zA-Z-]*):deadline:[a-z0-9-]+:[0-9]{12}:license-endpoint/le-[0-9a-z]{32}/metered-product/[0-9a-z]{1,32}-[.0-9a-z]{1,32} */
  Arn?: string;
};
