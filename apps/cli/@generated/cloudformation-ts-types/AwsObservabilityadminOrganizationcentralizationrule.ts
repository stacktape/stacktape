// This file is auto-generated. Do not edit manually.
// Source: aws-observabilityadmin-organizationcentralizationrule.json

/** Resource schema for AWS:ObservabilityAdmin:OrganizationCentralizationRule */
export type AwsObservabilityadminOrganizationcentralizationrule = {
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[0-9A-Za-z-]+$
   */
  RuleName: string;
  Rule: {
    Source: {
      Regions: string[];
      /**
       * @minLength 1
       * @maxLength 2000
       */
      Scope?: string;
      SourceLogsConfiguration?: {
        /**
         * @minLength 1
         * @maxLength 2000
         */
        LogGroupSelectionCriteria: string;
        /** @enum ["ALLOW","SKIP"] */
        EncryptedLogGroupStrategy: "ALLOW" | "SKIP";
      };
    };
    Destination: {
      Region: string;
      Account?: string;
      DestinationLogsConfiguration?: {
        LogsEncryptionConfiguration?: {
          /** @enum ["CUSTOMER_MANAGED","AWS_OWNED"] */
          EncryptionStrategy: "CUSTOMER_MANAGED" | "AWS_OWNED";
          KmsKeyArn?: string;
          /** @enum ["ALLOW","SKIP"] */
          EncryptionConflictResolutionStrategy?: "ALLOW" | "SKIP";
        };
        BackupConfiguration?: {
          Region: string;
          KmsKeyArn?: string;
        };
      };
    };
  };
  /**
   * @minLength 1
   * @maxLength 1011
   * @pattern ^arn:aws([a-z0-9\-]+)?:([a-zA-Z0-9\-]+):([a-z0-9\-]+)?:([0-9]{12})?:(.+)$
   */
  RuleArn?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
