// This file is auto-generated. Do not edit manually.
// Source: aws-s3-multiregionaccesspointpolicy.json

/** The policy to be attached to a Multi Region Access Point */
export type AwsS3Multiregionaccesspointpolicy = {
  /**
   * The name of the Multi Region Access Point to apply policy
   * @minLength 3
   * @maxLength 50
   * @pattern ^[a-z0-9][-a-z0-9]{1,48}[a-z0-9]$
   */
  MrapName: string;
  /** Policy document to apply to a Multi Region Access Point */
  Policy: Record<string, unknown>;
  /** The Policy Status associated with this Multi Region Access Point */
  PolicyStatus?: {
    /**
     * Specifies whether the policy is public or not.
     * @enum ["true","false"]
     */
    IsPublic: "true" | "false";
  };
};
