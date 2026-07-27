// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-egressonlyinternetgateway.json

/** Resource Type definition for AWS::EC2::EgressOnlyInternetGateway */
export type AwsEc2Egressonlyinternetgateway = {
  /** Service Generated ID of the EgressOnlyInternetGateway */
  Id?: string;
  /** The ID of the VPC for which to create the egress-only internet gateway. */
  VpcId: string;
  /**
   * Any tags assigned to the egress only internet gateway.
   * @uniqueItems false
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /** @maxLength 256 */
    Value: string;
  }[];
};
