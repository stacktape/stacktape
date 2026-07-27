// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-vpcpeeringconnection.json

/** Resource Type definition for AWS::EC2::VPCPeeringConnection */
export type AwsEc2Vpcpeeringconnection = {
  /**
   * The Amazon Resource Name (ARN) of the VPC peer role for the peering connection in another AWS
   * account.
   */
  PeerRoleArn?: string;
  /** The ID of the VPC. */
  VpcId: string;
  /**
   * The ID of the VPC with which you are creating the VPC peering connection. You must specify this
   * parameter in the request.
   */
  PeerVpcId: string;
  Id?: string;
  /**
   * The Region code for the accepter VPC, if the accepter VPC is located in a Region other than the
   * Region in which you make the request.
   */
  PeerRegion?: string;
  /** The AWS account ID of the owner of the accepter VPC. */
  PeerOwnerId?: string;
  /** @uniqueItems false */
  Tags?: {
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Value: string;
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Key: string;
  }[];
};
