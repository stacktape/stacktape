// This file is auto-generated. Do not edit manually.
// Source: aws-bedrockagentcore-workloadidentity.json

/** Definition of AWS::BedrockAgentCore::WorkloadIdentity Resource Type */
export type AwsBedrockagentcoreWorkloadidentity = {
  /**
   * The name of the workload identity. The name must be unique within your account.
   * @minLength 3
   * @maxLength 255
   * @pattern [A-Za-z0-9_.-]+
   */
  Name: string;
  /** The list of allowed OAuth2 return URLs for resources associated with this workload identity. */
  AllowedResourceOauth2ReturnUrls?: string[];
  /**
   * The Amazon Resource Name (ARN) of the workload identity.
   * @minLength 1
   * @maxLength 1024
   */
  WorkloadIdentityArn?: string;
  /** The timestamp when the workload identity was created. */
  CreatedTime?: number;
  /** The timestamp when the workload identity was last updated. */
  LastUpdatedTime?: number;
  /** An array of key-value pairs to apply to this resource. */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
