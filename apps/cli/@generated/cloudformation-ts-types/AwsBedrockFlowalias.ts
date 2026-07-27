// This file is auto-generated. Do not edit manually.
// Source: aws-bedrock-flowalias.json

/** Definition of AWS::Bedrock::FlowAlias Resource Type */
export type AwsBedrockFlowalias = {
  /**
   * Arn of the Flow Alias
   * @maxLength 2048
   * @pattern ^arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:flow/[0-9a-zA-Z]{10}/alias/[0-9a-zA-Z]{10}$
   */
  Arn?: string;
  /**
   * Arn representation of the Flow
   * @maxLength 2048
   * @pattern ^arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:flow/[0-9a-zA-Z]{10}$
   */
  FlowArn: string;
  ConcurrencyConfiguration?: {
    Type: "Automatic" | "Manual";
    /**
     * Number of nodes executed concurrently at a time
     * @minimum 1
     * @maximum 100
     */
    MaxConcurrency?: number;
  };
  /** Time Stamp. */
  CreatedAt?: string;
  /**
   * Description of the Resource.
   * @minLength 1
   * @maxLength 200
   */
  Description?: string;
  /**
   * Identifier for a flow resource.
   * @pattern ^[0-9a-zA-Z]{10}$
   */
  FlowId?: string;
  /**
   * Id for a Flow Alias generated at the server side.
   * @minLength 10
   * @maxLength 10
   * @pattern ^(\bTSTALIASID\b|[0-9a-zA-Z]+)$
   */
  Id?: string;
  /**
   * Name for a resource.
   * @pattern ^([0-9a-zA-Z][_-]?){1,100}$
   */
  Name: string;
  /**
   * Routing configuration for a Flow alias.
   * @minItems 1
   * @maxItems 1
   */
  RoutingConfiguration: {
    /**
     * Version.
     * @minLength 1
     * @maxLength 5
     * @pattern ^(DRAFT|[0-9]{0,4}[1-9][0-9]{0,4})$
     */
    FlowVersion?: string;
  }[];
  /** Time Stamp. */
  UpdatedAt?: string;
  Tags?: Record<string, string>;
};
