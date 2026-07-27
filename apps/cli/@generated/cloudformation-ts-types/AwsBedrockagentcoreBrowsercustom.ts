// This file is auto-generated. Do not edit manually.
// Source: aws-bedrockagentcore-browsercustom.json

/** Resource definition for AWS::BedrockAgentCore::BrowserCustom */
export type AwsBedrockagentcoreBrowsercustom = {
  /** The id of the browser. */
  BrowserId?: string;
  /** The ARN of a Browser resource. */
  BrowserArn?: string;
  /** The name of the browser. */
  Name: string;
  /** The description of the browser. */
  Description?: string;
  /** Network configuration for browser. */
  NetworkConfiguration: {
    /** @default "PUBLIC" */
    NetworkMode: "PUBLIC" | "VPC";
    VpcConfig?: {
      SecurityGroups: string[];
      Subnets: string[];
    };
  };
  /** Recording configuration for browser. */
  RecordingConfig?: {
    /** @default false */
    Enabled?: boolean;
    S3Location?: {
      /** @pattern ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ */
      Bucket: string;
      /** @minLength 1 */
      Prefix: string;
    };
  };
  /** Browser signing configuration. */
  BrowserSigning?: {
    /** @default false */
    Enabled?: boolean;
  };
  /** The Amazon Resource Name (ARN) of the IAM role that the browser uses to access resources. */
  ExecutionRoleArn?: string;
  /** Status of browser. */
  Status?: "CREATING" | "CREATE_FAILED" | "READY" | "DELETING" | "DELETE_FAILED" | "DELETED";
  /** The reason for failure if the browser creation or operation failed. */
  FailureReason?: string;
  /** Timestamp when the browser was created. */
  CreatedAt?: string;
  /** Timestamp when the browser was last updated. */
  LastUpdatedAt?: string;
  Tags?: Record<string, string>;
};
