// This file is auto-generated. Do not edit manually.
// Source: aws-entityresolution-matchingworkflow.json

/** MatchingWorkflow defined in AWS Entity Resolution service */
export type AwsEntityresolutionMatchingworkflow = {
  /** The name of the MatchingWorkflow */
  WorkflowName: string;
  /** The description of the MatchingWorkflow */
  Description?: string;
  /**
   * @minItems 1
   * @maxItems 20
   */
  InputSourceConfig: {
    /**
     * An Glue table ARN for the input source table
     * @pattern arn:(aws|aws-us-gov|aws-cn):.*:.*:[0-9]+:.*$
     */
    InputSourceARN: string;
    SchemaArn: string;
    ApplyNormalization?: boolean;
  }[];
  /**
   * @minItems 1
   * @maxItems 1
   */
  OutputSourceConfig: {
    /**
     * The S3 path to which Entity Resolution will write the output table
     * @pattern ^s3://([^/]+)/?(.*?([^/]+)/?)$
     */
    OutputS3Path: string;
    /**
     * @minItems 0
     * @maxItems 750
     */
    Output: {
      Name: string;
      Hashed?: boolean;
    }[];
    KMSArn?: string;
    ApplyNormalization?: boolean;
  }[];
  ResolutionTechniques: {
    ResolutionType?: "RULE_MATCHING" | "ML_MATCHING" | "PROVIDER";
    RuleBasedProperties?: {
      /**
       * @minItems 1
       * @maxItems 25
       */
      Rules: {
        /**
         * @minLength 0
         * @maxLength 255
         * @pattern ^[a-zA-Z_0-9- \t]*$
         */
        RuleName: string;
        /**
         * @minItems 1
         * @maxItems 15
         */
        MatchingKeys: string[];
      }[];
      /** @enum ["ONE_TO_ONE","MANY_TO_MANY"] */
      AttributeMatchingModel: "ONE_TO_ONE" | "MANY_TO_MANY";
      /** @enum ["IDENTIFIER_GENERATION","INDEXING"] */
      MatchPurpose?: "IDENTIFIER_GENERATION" | "INDEXING";
    };
    RuleConditionProperties?: {
      /**
       * @minItems 1
       * @maxItems 25
       */
      Rules: {
        RuleName?: string;
        Condition?: string;
      }[];
    };
    ProviderProperties?: {
      /** Arn of the Provider service being used. */
      ProviderServiceArn: string;
      /**
       * Additional Provider configuration that would be required for the provider service. The
       * Configuration must be in JSON string format
       */
      ProviderConfiguration?: Record<string, string>;
      IntermediateSourceConfiguration?: {
        /**
         * The s3 path that would be used to stage the intermediate data being generated during workflow
         * execution.
         */
        IntermediateS3Path: string;
      };
    };
  };
  /** @pattern ^arn:(aws|aws-us-gov|aws-cn):iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+$ */
  RoleArn: string;
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
  WorkflowArn?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  IncrementalRunConfig?: {
    /** @enum ["IMMEDIATE"] */
    IncrementalRunType: "IMMEDIATE";
  };
};
