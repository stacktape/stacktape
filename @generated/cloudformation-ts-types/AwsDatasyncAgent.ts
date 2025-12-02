// This file is auto-generated. Do not edit manually.
// Source: aws-datasync-agent.json

/** Resource schema for AWS::DataSync::Agent. */
export type AwsDatasyncAgent = {
  /**
   * The name configured for the agent. Text reference used to identify the agent in the console.
   * @minLength 0
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9\s+=._:@/-]+$
   */
  AgentName?: string;
  /**
   * Activation key of the Agent.
   * @maxLength 29
   * @pattern [A-Z0-9]{5}(-[A-Z0-9]{5}){4}
   */
  ActivationKey?: string;
  /** The ARNs of the security group used to protect your data transfer task subnets. */
  SecurityGroupArns?: string[];
  /**
   * The ARNs of the subnets in which DataSync will create elastic network interfaces for each data
   * transfer task.
   */
  SubnetArns?: string[];
  /**
   * The ID of the VPC endpoint that the agent has access to.
   * @pattern ^vpce-[0-9a-f]{17}$
   */
  VpcEndpointId?: string;
  /**
   * The service endpoints that the agent will connect to.
   * @enum ["FIPS","PUBLIC","PRIVATE_LINK"]
   */
  EndpointType?: "FIPS" | "PUBLIC" | "PRIVATE_LINK";
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key for an AWS resource tag.
     * @minLength 1
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9\s+=._:/-]+$
     */
    Key: string;
    /**
     * The value for an AWS resource tag.
     * @minLength 1
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9\s+=._:@/-]+$
     */
    Value: string;
  }[];
  /**
   * The DataSync Agent ARN.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):datasync:[a-z\-0-9]+:[0-9]{12}:agent/agent-[0-9a-z]{17}$
   */
  AgentArn?: string;
};
