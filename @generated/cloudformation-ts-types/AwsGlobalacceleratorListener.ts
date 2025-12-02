// This file is auto-generated. Do not edit manually.
// Source: aws-globalaccelerator-listener.json

/** Resource Type definition for AWS::GlobalAccelerator::Listener */
export type AwsGlobalacceleratorListener = {
  /** The Amazon Resource Name (ARN) of the listener. */
  ListenerArn?: string;
  /** The Amazon Resource Name (ARN) of the accelerator. */
  AcceleratorArn: string;
  PortRanges: {
    FromPort: number;
    ToPort: number;
  }[];
  /**
   * The protocol for the listener.
   * @default "TCP"
   * @enum ["TCP","UDP"]
   */
  Protocol: "TCP" | "UDP";
  /**
   * Client affinity lets you direct all requests from a user to the same endpoint.
   * @default "NONE"
   * @enum ["NONE","SOURCE_IP"]
   */
  ClientAffinity?: "NONE" | "SOURCE_IP";
};
