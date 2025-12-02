// This file is auto-generated. Do not edit manually.
// Source: aws-iotsitewise-gateway.json

/** Resource schema for AWS::IoTSiteWise::Gateway */
export type AwsIotsitewiseGateway = {
  /** A unique, friendly name for the gateway. */
  GatewayName: string;
  /** The gateway's platform. You can only specify one platform in a gateway. */
  GatewayPlatform: unknown | unknown;
  /** The version of the gateway you want to create. */
  GatewayVersion?: string;
  /**
   * A list of key-value pairs that contain metadata for the gateway.
   * @uniqueItems false
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  /** The ID of the gateway device. */
  GatewayId?: string;
  /**
   * A list of gateway capability summaries that each contain a namespace and status.
   * @uniqueItems true
   */
  GatewayCapabilitySummaries?: {
    CapabilityNamespace: string;
    CapabilityConfiguration?: string;
  }[];
};
