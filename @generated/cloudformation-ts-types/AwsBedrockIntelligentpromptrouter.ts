// This file is auto-generated. Do not edit manually.
// Source: aws-bedrock-intelligentpromptrouter.json

/** Definition of AWS::Bedrock::IntelligentPromptRouter Resource Type */
export type AwsBedrockIntelligentpromptrouter = {
  /** Time Stamp */
  CreatedAt?: string;
  /**
   * Description of the Prompt Router.
   * @minLength 1
   * @maxLength 200
   * @pattern ^([0-9a-zA-Z:.][ _-]?)+$
   */
  Description?: string;
  FallbackModel: {
    /**
     * Arn of underlying model which are added in the Prompt Router.
     * @minLength 1
     * @maxLength 2048
     * @pattern (^arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}::foundation-model/[a-z0-9-]{1,63}[.]{1}([a-z0-9-]{1,63}[.]){0,2}[a-z0-9-]{1,63}([:][a-z0-9-]{1,63}){0,2})|(^arn:aws(|-us-gov|-cn|-iso|-iso-b):bedrock:(|[0-9a-z-]{0,20}):(|[0-9]{12}):(inference-profile|application-inference-profile)/[a-zA-Z0-9-:.]+)$
     */
    ModelArn: string;
  };
  /** List of model configuration */
  Models: {
    /**
     * Arn of underlying model which are added in the Prompt Router.
     * @minLength 1
     * @maxLength 2048
     * @pattern (^arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}::foundation-model/[a-z0-9-]{1,63}[.]{1}([a-z0-9-]{1,63}[.]){0,2}[a-z0-9-]{1,63}([:][a-z0-9-]{1,63}){0,2})|(^arn:aws(|-us-gov|-cn|-iso|-iso-b):bedrock:(|[0-9a-z-]{0,20}):(|[0-9]{12}):(inference-profile|application-inference-profile)/[a-zA-Z0-9-:.]+)$
     */
    ModelArn: string;
  }[];
  /**
   * Arn of the Prompt Router.
   * @minLength 1
   * @maxLength 2048
   * @pattern ^arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:(default-)?prompt-router/[a-zA-Z0-9-:.]+$
   */
  PromptRouterArn?: string;
  /**
   * Name of the Prompt Router.
   * @minLength 1
   * @maxLength 64
   * @pattern ^([0-9a-zA-Z][ _-]?)+$
   */
  PromptRouterName: string;
  RoutingCriteria: {
    /**
     * @minimum 0
     * @maximum 100
     */
    ResponseQualityDifference: number;
  };
  Status?: "AVAILABLE";
  /**
   * List of Tags
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * Tag Key
     * @minLength 1
     * @maxLength 128
     * @pattern ^[a-zA-Z0-9\s._:/=+@-]*$
     */
    Key: string;
    /**
     * Tag Value
     * @minLength 0
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9\s._:/=+@-]*$
     */
    Value: string;
  }[];
  Type?: "custom" | "default";
  /** Time Stamp */
  UpdatedAt?: string;
};
