// This file is auto-generated. Do not edit manually.
// Source: aws-route53-keysigningkey.json

/**
 * Represents a key signing key (KSK) associated with a hosted zone. You can only have two KSKs per
 * hosted zone.
 */
export type AwsRoute53Keysigningkey = {
  /**
   * The unique string (ID) used to identify a hosted zone.
   * @pattern ^[A-Z0-9]{1,32}$
   */
  HostedZoneId: string;
  /**
   * A string specifying the initial status of the key signing key (KSK). You can set the value to
   * ACTIVE or INACTIVE.
   * @enum ["ACTIVE","INACTIVE"]
   */
  Status: "ACTIVE" | "INACTIVE";
  /**
   * An alphanumeric string used to identify a key signing key (KSK). Name must be unique for each key
   * signing key in the same hosted zone.
   * @pattern ^[a-zA-Z0-9_]{3,128}$
   */
  Name: string;
  /**
   * The Amazon resource name (ARN) for a customer managed key (CMK) in AWS Key Management Service
   * (KMS). The KeyManagementServiceArn must be unique for each key signing key (KSK) in a single hosted
   * zone.
   * @minLength 1
   * @maxLength 256
   */
  KeyManagementServiceArn: string;
};
