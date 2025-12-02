// This file is auto-generated. Do not edit manually.
// Source: aws-entityresolution-idmappingworkflow.json

/** IdMappingWorkflow defined in AWS Entity Resolution service */
export type AwsEntityresolutionIdmappingworkflow = {
  /** The description of the IdMappingWorkflow */
  Description?: string;
  /**
   * @minItems 1
   * @maxItems 20
   */
  InputSourceConfig: ({
    /** @enum ["SOURCE","TARGET"] */
    Type?: "SOURCE" | "TARGET";
    /**
     * An Glue table ARN for the input source table, MatchingWorkflow arn or IdNamespace ARN
     * @pattern ^arn:(aws|aws-us-gov|aws-cn):entityresolution:[a-z]{2}-[a-z]{1,10}-[0-9]:[0-9]{12}:(idnamespace/[a-zA-Z_0-9-]{1,255})$|^arn:(aws|aws-us-gov|aws-cn):entityresolution:[a-z]{2}-[a-z]{1,10}-[0-9]:[0-9]{12}:(matchingworkflow/[a-zA-Z_0-9-]{1,255})$|^arn:(aws|aws-us-gov|aws-cn):glue:[a-z]{2}-[a-z]{1,10}-[0-9]:[0-9]{12}:(table/[a-zA-Z_0-9-]{1,255}/[a-zA-Z_0-9-]{1,255})$
     */
    InputSourceARN: string;
    SchemaArn?: string;
  })[];
  IdMappingTechniques: {
    RuleBasedProperties?: {
      /** @enum ["ONE_TO_ONE","MANY_TO_MANY"] */
      AttributeMatchingModel: "ONE_TO_ONE" | "MANY_TO_MANY";
      /** @enum ["SOURCE","TARGET"] */
      RuleDefinitionType?: "SOURCE" | "TARGET";
      /**
       * @minItems 1
       * @maxItems 25
       */
      Rules?: {
        /**
         * @minItems 1
         * @maxItems 15
         */
        MatchingKeys: string[];
        /**
         * @minLength 0
         * @maxLength 255
         * @pattern ^[a-zA-Z_0-9- \t]*$
         */
        RuleName: string;
      }[];
      /** @enum ["ONE_SOURCE_TO_ONE_TARGET","MANY_SOURCE_TO_ONE_TARGET"] */
      RecordMatchingModel: "ONE_SOURCE_TO_ONE_TARGET" | "MANY_SOURCE_TO_ONE_TARGET";
    };
    ProviderProperties?: {
      IntermediateSourceConfiguration?: {
        /**
         * The s3 path that would be used to stage the intermediate data being generated during workflow
         * execution.
         */
        IntermediateS3Path: string;
      };
      /**
       * Arn of the Provider Service being used.
       * @pattern ^arn:(aws|aws-us-gov|aws-cn):(entityresolution):([a-z]{2}-[a-z]{1,10}-[0-9])::providerservice/([a-zA-Z0-9_-]{1,255})/([a-zA-Z0-9_-]{1,255})$
       */
      ProviderServiceArn: string;
      /**
       * Additional Provider configuration that would be required for the provider service. The
       * Configuration must be in JSON string format
       */
      ProviderConfiguration?: Record<string, string>;
    };
    /** @enum ["PROVIDER","RULE_BASED"] */
    IdMappingType?: "PROVIDER" | "RULE_BASED";
    NormalizationVersion?: string;
  };
  /** The name of the IdMappingWorkflow */
  WorkflowName: string;
  CreatedAt?: string;
  /**
   * @minItems 1
   * @maxItems 1
   */
  OutputSourceConfig?: {
    KMSArn?: string;
    /**
     * The S3 path to which Entity Resolution will write the output table
     * @pattern ^s3://([^/]+)/?(.*?([^/]+)/?)$
     */
    OutputS3Path: string;
  }[];
  IdMappingIncrementalRunConfig?: {
    /** @enum ["ON_DEMAND"] */
    IncrementalRunType: "ON_DEMAND";
  };
  WorkflowArn?: string;
  UpdatedAt?: string;
  /** @pattern ^arn:(aws|aws-us-gov|aws-cn):iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+$ */
  RoleArn: string;
  /**
   * @minItems 0
   * @maxItems 200
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
};
