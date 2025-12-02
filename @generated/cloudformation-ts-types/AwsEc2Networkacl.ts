// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-networkacl.json

/**
 * Specifies a network ACL for your VPC.
 * To add a network ACL entry, see
 * [AWS::EC2::NetworkAclEntry](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-networkaclentry.html).
 */
export type AwsEc2Networkacl = {
  /** The ID of the VPC for the network ACL. */
  VpcId: string;
  Id?: string;
  /**
   * The tags for the network ACL.
   * @uniqueItems false
   */
  Tags?: {
    /** The tag value. */
    Value: string;
    /** The tag key. */
    Key: string;
  }[];
};
