// This file is auto-generated. Do not edit manually.
// Source: aws-bedrock-agentalias.json

/** Definition of AWS::Bedrock::AgentAlias Resource Type */
export type AwsBedrockAgentalias = {
  /**
   * Arn representation of the Agent Alias.
   * @maxLength 2048
   * @pattern ^arn:aws(|-cn|-us-gov):bedrock:[a-z0-9-]{1,20}:[0-9]{12}:agent-alias/[0-9a-zA-Z]{10}/[0-9a-zA-Z]{10}$
   */
  AgentAliasArn?: string;
  /**
   * The list of history events for an alias for an Agent.
   * @maxItems 10
   */
  AgentAliasHistoryEvents?: {
    /**
     * Routing configuration for an Agent alias.
     * @maxItems 1
     */
    RoutingConfiguration?: {
      /**
       * Agent Version.
       * @minLength 1
       * @maxLength 5
       * @pattern ^(DRAFT|[0-9]{0,4}[1-9][0-9]{0,4})$
       */
      AgentVersion: string;
    }[];
    /** Time Stamp. */
    EndDate?: string;
    /** Time Stamp. */
    StartDate?: string;
  }[];
  /**
   * Id for an Agent Alias generated at the server side.
   * @minLength 10
   * @maxLength 10
   * @pattern ^(\bTSTALIASID\b|[0-9a-zA-Z]+)$
   */
  AgentAliasId?: string;
  /**
   * Name for a resource.
   * @pattern ^([0-9a-zA-Z][_-]?){1,100}$
   */
  AgentAliasName: string;
  AgentAliasStatus?: "CREATING" | "PREPARED" | "FAILED" | "UPDATING" | "DELETING";
  /**
   * Identifier for a resource.
   * @pattern ^[0-9a-zA-Z]{10}$
   */
  AgentId: string;
  /** Time Stamp. */
  CreatedAt?: string;
  /**
   * Description of the Resource.
   * @minLength 1
   * @maxLength 200
   */
  Description?: string;
  /**
   * Routing configuration for an Agent alias.
   * @maxItems 1
   */
  RoutingConfiguration?: {
    /**
     * Agent Version.
     * @minLength 1
     * @maxLength 5
     * @pattern ^(DRAFT|[0-9]{0,4}[1-9][0-9]{0,4})$
     */
    AgentVersion: string;
  }[];
  Tags?: Record<string, string>;
  /** Time Stamp. */
  UpdatedAt?: string;
};
