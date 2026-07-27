// This file is auto-generated. Do not edit manually.
// Source: aws-bedrock-applicationinferenceprofile.json

/** Definition of AWS::Bedrock::ApplicationInferenceProfile Resource Type */
export type AwsBedrockApplicationinferenceprofile = {
  /** Time Stamp */
  CreatedAt?: string;
  /**
   * Description of the inference profile
   * @minLength 1
   * @maxLength 200
   * @pattern ^([0-9a-zA-Z:.][ _-]?)+$
   */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 2048
   * @pattern ^arn:aws(|-us-gov|-cn|-iso|-iso-b):bedrock:(|[0-9a-z-]{0,20}):(|[0-9]{12}):(inference-profile|application-inference-profile)/[a-zA-Z0-9-:.]+$
   */
  InferenceProfileArn?: string;
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9-:.]+$
   */
  InferenceProfileId?: string;
  /**
   * Inference profile identifier. Supports both system-defined inference profile ids, and inference
   * profile ARNs.
   * @minLength 1
   * @maxLength 2048
   * @pattern ^(arn:aws(|-us-gov|-cn|-iso|-iso-b):bedrock:(|[0-9a-z-]{0,20}):(|[0-9]{12}):(inference-profile|application-inference-profile)/)?[a-zA-Z0-9-:.]+$
   */
  InferenceProfileIdentifier?: string;
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^([0-9a-zA-Z][ _-]?)+$
   */
  InferenceProfileName: string;
  ModelSource?: {
    /**
     * Source arns for a custom inference profile to copy its regional load balancing config from. This
     * can either be a foundation model or predefined inference profile ARN.
     * @minLength 1
     * @maxLength 2048
     * @pattern ^arn:aws(|-us-gov|-cn|-iso|-iso-b):bedrock:(|[0-9a-z-]{0,20}):(|[0-9]{12}):(inference-profile|foundation-model)/[a-zA-Z0-9-:.]+$
     */
    CopyFrom: string;
  };
  /**
   * List of model configuration
   * @minItems 1
   * @maxItems 5
   */
  Models?: {
    /**
     * ARN for Foundation Models in Bedrock. These models can be used as base models for model
     * customization jobs
     * @pattern ^arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}::foundation-model/[a-z0-9-]{1,63}[.]{1}([a-z0-9-]{1,63}[.]){0,2}[a-z0-9-]{1,63}([:][a-z0-9-]{1,63}){0,2}$
     */
    ModelArn?: string;
  }[];
  Status?: "ACTIVE";
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
  Type?: "APPLICATION" | "SYSTEM_DEFINED";
  /** Time Stamp */
  UpdatedAt?: string;
};
