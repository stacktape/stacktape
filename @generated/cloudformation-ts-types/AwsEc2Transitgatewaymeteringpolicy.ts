// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-transitgatewaymeteringpolicy.json

/** AWS::EC2::TransitGatewayMeteringPolicy Resource Definition */
export type AwsEc2Transitgatewaymeteringpolicy = {
  /** The Id of transit gateway */
  TransitGatewayId: string;
  /** Middle box attachment Ids */
  MiddleboxAttachmentIds?: string[];
  /** State of the transit gateway metering policy */
  State?: string;
  /** The timestamp at which the latest action performed on the metering policy will become effective */
  UpdateEffectiveAt?: string;
  /** The Id of the transit gateway metering policy */
  TransitGatewayMeteringPolicyId?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
