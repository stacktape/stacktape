// This file is auto-generated. Do not edit manually.
// Source: aws-entityresolution-idnamespace.json

/** IdNamespace defined in AWS Entity Resolution service */
export type AwsEntityresolutionIdnamespace = {
  IdNamespaceName: string;
  /**
   * @minLength 0
   * @maxLength 255
   */
  Description?: string;
  /**
   * @minItems 0
   * @maxItems 20
   */
  InputSourceConfig?: {
    /** @pattern ^arn:(aws|aws-us-gov|aws-cn):entityresolution:[a-z]{2}-[a-z]{1,10}-[0-9]:[0-9]{12}:(matchingworkflow/[a-zA-Z_0-9-]{1,255})$|^arn:(aws|aws-us-gov|aws-cn):glue:[a-z]{2}-[a-z]{1,10}-[0-9]:[0-9]{12}:(table/[a-zA-Z_0-9-]{1,255}/[a-zA-Z_0-9-]{1,255})$ */
    InputSourceARN: string;
    SchemaName?: string;
  }[];
  /**
   * @minItems 1
   * @maxItems 1
   */
  IdMappingWorkflowProperties?: ({
    /** @enum ["PROVIDER","RULE_BASED"] */
    IdMappingType: "PROVIDER" | "RULE_BASED";
    RuleBasedProperties?: {
      /**
       * @minItems 1
       * @maxItems 25
       */
      Rules?: {
        /**
         * @minLength 0
         * @maxLength 255
         * @pattern ^[a-zA-Z_0-9- \t]*$
         */
        RuleName: string;
        /**
         * @minItems 1
         * @maxItems 25
         */
        MatchingKeys: string[];
      }[];
      RuleDefinitionTypes?: ("SOURCE" | "TARGET")[];
      /** @enum ["ONE_TO_ONE","MANY_TO_MANY"] */
      AttributeMatchingModel?: "ONE_TO_ONE" | "MANY_TO_MANY";
      RecordMatchingModels?: ("ONE_SOURCE_TO_ONE_TARGET" | "MANY_SOURCE_TO_ONE_TARGET")[];
    };
    ProviderProperties?: {
      ProviderServiceArn: string;
      /**
       * Additional Provider configuration that would be required for the provider service. The
       * Configuration must be in JSON string format.
       */
      ProviderConfiguration?: Record<string, string>;
    };
  })[];
  /** @enum ["SOURCE","TARGET"] */
  Type: "SOURCE" | "TARGET";
  /**
   * @minLength 32
   * @maxLength 512
   * @pattern ^arn:(aws|aws-us-gov|aws-cn):iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+$
   */
  RoleArn?: string;
  /**
   * The arn associated with the IdNamespace
   * @pattern ^arn:(aws|aws-us-gov|aws-cn):entityresolution:[a-z]{2}-[a-z]{1,10}-[0-9]:[0-9]{12}:(idnamespace/[a-zA-Z_0-9-]{1,255})$
   */
  IdNamespaceArn?: string;
  /** The date and time when the IdNamespace was created */
  CreatedAt?: string;
  /** The date and time when the IdNamespace was updated */
  UpdatedAt?: string;
  /**
   * @minItems 0
   * @maxItems 200
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
