// This file is auto-generated. Do not edit manually.
// Source: aws-iotwireless-partneraccount.json

/** Create and manage partner account */
export type AwsIotwirelessPartneraccount = {
  /** The Sidewalk account credentials. */
  Sidewalk?: {
    /**
     * @minLength 1
     * @maxLength 4096
     * @pattern [a-fA-F0-9]{64}
     */
    AppServerPrivateKey: string;
  };
  /**
   * The partner account ID to disassociate from the AWS account
   * @maxLength 256
   */
  PartnerAccountId?: string;
  /**
   * The partner type
   * @enum ["Sidewalk"]
   */
  PartnerType?: "Sidewalk";
  /** The Sidewalk account credentials. */
  SidewalkResponse?: {
    /** @maxLength 2048 */
    AmazonId?: string;
    /**
     * @minLength 64
     * @maxLength 64
     * @pattern [a-fA-F0-9]{64}
     */
    Fingerprint?: string;
    Arn?: string;
  };
  /** Whether the partner account is linked to the AWS account. */
  AccountLinked?: boolean;
  /** The Sidewalk account credentials. */
  SidewalkUpdate?: {
    /**
     * @minLength 1
     * @maxLength 4096
     * @pattern [a-fA-F0-9]{64}
     */
    AppServerPrivateKey?: string;
  };
  /** The fingerprint of the Sidewalk application server private key. */
  Fingerprint?: string;
  /** PartnerAccount arn. Returned after successful create. */
  Arn?: string;
  /**
   * A list of key-value pairs that contain metadata for the destination.
   * @maxItems 200
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 127
     */
    Key?: string;
    /**
     * @minLength 1
     * @maxLength 255
     */
    Value?: string;
  }[];
};
