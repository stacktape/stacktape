// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-carriergateway.json

/** Resource Type definition for Carrier Gateway which describes the Carrier Gateway resource */
export type AwsEc2Carriergateway = {
  /** The ID of the carrier gateway. */
  CarrierGatewayId?: string;
  /** The state of the carrier gateway. */
  State?: string;
  /** The ID of the VPC. */
  VpcId: string;
  /** The ID of the owner. */
  OwnerId?: string;
  /** The tags for the carrier gateway. */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 127
     * @pattern ^(?!aws:.*)
     */
    Key?: string;
    /**
     * @minLength 1
     * @maxLength 255
     * @pattern ^(?!aws:.*)
     */
    Value?: string;
  }[];
};
