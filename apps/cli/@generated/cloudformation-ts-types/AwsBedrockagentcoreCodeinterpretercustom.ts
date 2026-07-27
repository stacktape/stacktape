// This file is auto-generated. Do not edit manually.
// Source: aws-bedrockagentcore-codeinterpretercustom.json

/** Resource definition for AWS::BedrockAgentCore::CodeInterpreterCustom */
export type AwsBedrockagentcoreCodeinterpretercustom = {
  /** The id of the code interpreter. */
  CodeInterpreterId?: string;
  /** The ARN of a CodeInterpreter resource. */
  CodeInterpreterArn?: string;
  /** The name of the code interpreter. */
  Name: string;
  /** The description of the code interpreter. */
  Description?: string;
  /** The ARN of the IAM role that the code interpreter uses to access resources. */
  ExecutionRoleArn?: string;
  /** Network configuration for code interpreter. */
  NetworkConfiguration: {
    /** @default "SANDBOX" */
    NetworkMode: "PUBLIC" | "SANDBOX" | "VPC";
    VpcConfig?: {
      SecurityGroups: string[];
      Subnets: string[];
    };
  };
  /** Status of code interpreter. */
  Status?: "CREATING" | "CREATE_FAILED" | "READY" | "DELETING" | "DELETE_FAILED" | "DELETED";
  /** The reason for failure if the code interpreter creation or operation failed. */
  FailureReason?: string;
  /** Timestamp when the code interpreter was created. */
  CreatedAt?: string;
  /** Timestamp when the code interpreter was last updated. */
  LastUpdatedAt?: string;
  Tags?: Record<string, string>;
};
