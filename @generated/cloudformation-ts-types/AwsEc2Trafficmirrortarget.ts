// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-trafficmirrortarget.json

/** The description of the Traffic Mirror target. */
export type AwsEc2Trafficmirrortarget = {
  /** The Amazon Resource Name (ARN) of the Network Load Balancer that is associated with the target. */
  NetworkLoadBalancerArn?: string;
  /** The description of the Traffic Mirror target. */
  Description?: string;
  Id?: string;
  /** The network interface ID that is associated with the target. */
  NetworkInterfaceId?: string;
  /** The ID of the Gateway Load Balancer endpoint. */
  GatewayLoadBalancerEndpointId?: string;
  /**
   * The tags to assign to the Traffic Mirror target.
   * @uniqueItems false
   */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
