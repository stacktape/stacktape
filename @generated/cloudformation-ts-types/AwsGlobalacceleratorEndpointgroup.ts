// This file is auto-generated. Do not edit manually.
// Source: aws-globalaccelerator-endpointgroup.json

/** Resource Type definition for AWS::GlobalAccelerator::EndpointGroup */
export type AwsGlobalacceleratorEndpointgroup = {
  /** The Amazon Resource Name (ARN) of the listener */
  ListenerArn: string;
  /** The name of the AWS Region where the endpoint group is located */
  EndpointGroupRegion: string;
  /** The list of endpoint objects. */
  EndpointConfigurations?: {
    /**
     * Id of the endpoint. For Network/Application Load Balancer this value is the ARN.  For EIP, this
     * value is the allocation ID.  For EC2 instances, this is the EC2 instance ID
     */
    EndpointId: string;
    /**
     * Attachment ARN that provides access control to the cross account endpoint. Not required for
     * resources hosted in the same account as the endpoint group.
     */
    AttachmentArn?: string;
    /**
     * The weight for the endpoint.
     * @default 100
     * @minimum 0
     * @maximum 255
     */
    Weight?: number;
    /**
     * true if client ip should be preserved
     * @default true
     */
    ClientIPPreservationEnabled?: boolean;
  }[];
  /**
   * The percentage of traffic to sent to an AWS Region
   * @default 100
   * @minimum 0
   * @maximum 100
   */
  TrafficDialPercentage?: number;
  /**
   * The port that AWS Global Accelerator uses to check the health of endpoints in this endpoint group.
   * @default -1
   * @minimum -1
   * @maximum 65535
   */
  HealthCheckPort?: number;
  /**
   * The protocol that AWS Global Accelerator uses to check the health of endpoints in this endpoint
   * group.
   * @default "TCP"
   * @enum ["TCP","HTTP","HTTPS"]
   */
  HealthCheckProtocol?: "TCP" | "HTTP" | "HTTPS";
  /** @default "/" */
  HealthCheckPath?: string;
  /**
   * The time in seconds between each health check for an endpoint. Must be a value of 10 or 30
   * @default 30
   */
  HealthCheckIntervalSeconds?: number;
  /**
   * The number of consecutive health checks required to set the state of the endpoint to unhealthy.
   * @default 3
   */
  ThresholdCount?: number;
  /** The Amazon Resource Name (ARN) of the endpoint group */
  EndpointGroupArn?: string;
  PortOverrides?: {
    ListenerPort: number;
    EndpointPort: number;
  }[];
};
