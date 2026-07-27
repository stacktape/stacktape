// This file is auto-generated. Do not edit manually.
// Source: aws-glue-usageprofile.json

/** This creates a Resource of UsageProfile type. */
export type AwsGlueUsageprofile = {
  /**
   * The name of the UsageProfile.
   * @minLength 5
   * @maxLength 128
   */
  Name: string;
  /**
   * The description of the UsageProfile.
   * @minLength 1
   * @maxLength 512
   * @pattern [a-zA-Z0-9\-\:\_]{1,64}
   */
  Description?: string;
  /**
   * UsageProfile configuration for supported service ex: (Jobs, Sessions).
   * @minItems 1
   */
  Configuration?: unknown | unknown;
  /**
   * The tags to be applied to this UsageProfiles.
   * @minItems 0
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * A key to identify the tag.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * Corresponding tag value for the key.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * Creation time.
   * @minLength 1
   * @maxLength 128
   */
  CreatedOn?: string;
};
