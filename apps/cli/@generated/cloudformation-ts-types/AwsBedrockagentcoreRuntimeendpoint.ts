// This file is auto-generated. Do not edit manually.
// Source: aws-bedrockagentcore-runtimeendpoint.json

/** Resource definition for AWS::BedrockAgentCore::RuntimeEndpoint */
export type AwsBedrockagentcoreRuntimeendpoint = {
  /** The ID of the parent Agent Runtime (required for creation) */
  AgentRuntimeId: string;
  /** The unique identifier of the AgentCore Runtime endpoint. */
  Id?: string;
  /** The name of the Agent Runtime Endpoint */
  Name: string;
  /** The version of the AgentCore Runtime to use for the endpoint. */
  AgentRuntimeVersion?: string;
  /** The Live version of the Agent Runtime */
  LiveVersion?: string;
  /** The target version of the AgentCore Runtime for the endpoint. */
  TargetVersion?: string;
  /** The description of the AgentCore Runtime endpoint. */
  Description?: string;
  /** The Amazon Resource Name (ARN) of the AgentCore Runtime. */
  AgentRuntimeEndpointArn?: string;
  /** The ARN of the Agent Runtime */
  AgentRuntimeArn?: string;
  /** The status of the Agent Runtime Endpoint */
  Status?: "CREATING" | "CREATE_FAILED" | "UPDATING" | "UPDATE_FAILED" | "READY" | "DELETING";
  /** The timestamp when the Agent Runtime Endpoint was created */
  CreatedAt?: string;
  /** The timestamp when the Agent Runtime Endpoint was last updated */
  LastUpdatedAt?: string;
  Tags?: Record<string, string>;
  /** The reason for failure if the endpoint is in a failed state */
  FailureReason?: string;
};
