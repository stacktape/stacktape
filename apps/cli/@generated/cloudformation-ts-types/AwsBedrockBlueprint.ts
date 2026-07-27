// This file is auto-generated. Do not edit manually.
// Source: aws-bedrock-blueprint.json

/** Definition of AWS::Bedrock::Blueprint Resource Type */
export type AwsBedrockBlueprint = {
  /**
   * ARN of a Blueprint
   * @maxLength 128
   * @pattern ^arn:aws(|-cn|-us-gov):bedrock:[a-zA-Z0-9-]*:(aws|[0-9]{12}):blueprint/(bedrock-data-automation-public-[a-zA-Z0-9-_]{1,30}|[a-zA-Z0-9-]{12,36})$
   */
  BlueprintArn?: string;
  /**
   * Name of the Blueprint
   * @minLength 1
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9-_]+$
   */
  BlueprintName: string;
  /** Creation timestamp */
  CreationTime?: string;
  /** Last modified timestamp */
  LastModifiedTime?: string;
  /** Schema of the blueprint */
  Schema: Record<string, unknown>;
  /**
   * Modality Type
   * @enum ["DOCUMENT","IMAGE","AUDIO","VIDEO"]
   */
  Type: "DOCUMENT" | "IMAGE" | "AUDIO" | "VIDEO";
  /**
   * Stage of the Blueprint
   * @enum ["DEVELOPMENT","LIVE"]
   */
  BlueprintStage?: "DEVELOPMENT" | "LIVE";
  /**
   * KMS key identifier
   * @minLength 1
   * @maxLength 2048
   */
  KmsKeyId?: string;
  /** KMS encryption context */
  KmsEncryptionContext?: Record<string, string>;
  /**
   * List of Tags
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * Key for the tag
     * @minLength 1
     * @maxLength 128
     * @pattern ^[a-zA-Z0-9\s._:/=+@-]*$
     */
    Key: string;
    /**
     * Value for the tag
     * @minLength 0
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9\s._:/=+@-]*$
     */
    Value: string;
  }[];
};
