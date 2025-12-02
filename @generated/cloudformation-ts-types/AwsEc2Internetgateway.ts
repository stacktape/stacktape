// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-internetgateway.json

/**
 * Allocates an internet gateway for use with a VPC. After creating the Internet gateway, you then
 * attach it to a VPC.
 */
export type AwsEc2Internetgateway = {
  InternetGatewayId?: string;
  /**
   * Any tags to assign to the internet gateway.
   * @uniqueItems false
   */
  Tags?: {
    /**
     * The tag key.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The tag value.
     * @maxLength 256
     */
    Value: string;
  }[];
};
