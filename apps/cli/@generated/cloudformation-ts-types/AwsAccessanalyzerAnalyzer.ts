// This file is auto-generated. Do not edit manually.
// Source: aws-accessanalyzer-analyzer.json

/** The AWS::AccessAnalyzer::Analyzer type specifies an analyzer of the user's account */
export type AwsAccessanalyzerAnalyzer = {
  /**
   * Analyzer name
   * @minLength 1
   * @maxLength 1024
   */
  AnalyzerName?: string;
  ArchiveRules?: {
    /** @minItems 1 */
    Filter: {
      Contains?: string[];
      Eq?: string[];
      Exists?: boolean;
      Property: string;
      Neq?: string[];
    }[];
    /** The archive rule name */
    RuleName: string;
  }[];
  /**
   * Amazon Resource Name (ARN) of the analyzer
   * @minLength 1
   * @maxLength 1600
   */
  Arn?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 127
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 255
     */
    Value?: string;
  }[];
  /**
   * The type of the analyzer, must be one of ACCOUNT, ORGANIZATION, ACCOUNT_INTERNAL_ACCESS,
   * ORGANIZATION_INTERNAL_ACCESS, ACCOUNT_UNUSED_ACCESS and ORGANIZATION_UNUSED_ACCESS
   * @minLength 0
   * @maxLength 1024
   */
  Type: string;
  /** The configuration for the analyzer */
  AnalyzerConfiguration?: {
    UnusedAccessConfiguration?: {
      /**
       * The specified access age in days for which to generate findings for unused access. For example, if
       * you specify 90 days, the analyzer will generate findings for IAM entities within the accounts of
       * the selected organization for any access that hasn't been used in 90 or more days since the
       * analyzer's last scan. You can choose a value between 1 and 365 days.
       * @minimum 1
       * @maximum 365
       */
      UnusedAccessAge?: number;
      /** Contains information about rules for the analyzer. */
      AnalysisRule?: {
        /**
         * A list of rules for the analyzer containing criteria to exclude from analysis. Entities that meet
         * the rule criteria will not generate findings.
         */
        Exclusions?: {
          /**
           * A list of AWS account IDs to apply to the analysis rule criteria. The accounts cannot include the
           * organization analyzer owner account. Account IDs can only be applied to the analysis rule criteria
           * for organization-level analyzers.
           */
          AccountIds?: string[];
          /**
           * An array of key-value pairs to match for your resources. You can use the set of Unicode letters,
           * digits, whitespace, _, ., /, =, +, and -.
           * For the tag key, you can specify a value that is 1 to 128 characters in length and cannot be
           * prefixed with aws:.
           * For the tag value, you can specify a value that is 0 to 256 characters in length. If the specified
           * tag value is 0 characters, the rule is applied to all principals with the specified tag key.
           */
          ResourceTags?: {
            /**
             * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
             * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
             * letters, digits, whitespace, _, ., /, =, +, and -.
             * @minLength 1
             * @maxLength 127
             */
            Key: string;
            /**
             * The value for the tag. You can specify a value that is 0 to 255 Unicode characters in length and
             * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
             * letters, digits, whitespace, _, ., /, =, +, and -.
             * @minLength 0
             * @maxLength 255
             */
            Value?: string;
          }[][];
        }[];
      };
    };
    InternalAccessConfiguration?: {
      /**
       * Contains information about analysis rules for the internal access analyzer. Analysis rules
       * determine which entities will generate findings based on the criteria you define when you create
       * the rule.
       */
      InternalAccessAnalysisRule?: {
        /**
         * A list of rules for the internal access analyzer containing criteria to include in analysis. Only
         * resources that meet the rule criteria will generate findings.
         */
        Inclusions?: {
          /**
           * A list of AWS account IDs to apply to the internal access analysis rule criteria. Account IDs can
           * only be applied to the analysis rule criteria for organization-level analyzers and cannot include
           * the organization owner account.
           */
          AccountIds?: string[];
          /**
           * A list of resource ARNs to apply to the internal access analysis rule criteria. The analyzer will
           * only generate findings for resources that match these ARNs.
           */
          ResourceArns?: string[];
          /**
           * A list of resource types to apply to the internal access analysis rule criteria. The analyzer will
           * only generate findings for resources of these types.
           */
          ResourceTypes?: string[];
        }[];
      };
    };
  };
};
