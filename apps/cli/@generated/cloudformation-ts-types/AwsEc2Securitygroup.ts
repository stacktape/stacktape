// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-securitygroup.json

/** Resource Type definition for AWS::EC2::SecurityGroup */
export type AwsEc2Securitygroup = {
  /** A description for the security group. */
  GroupDescription: string;
  /** The name of the security group. */
  GroupName?: string;
  /** The ID of the VPC for the security group. */
  VpcId?: string;
  /** The group name or group ID depending on whether the SG is created in default or specific VPC */
  Id?: string;
  /**
   * The inbound rules associated with the security group. There is a short interruption during which
   * you cannot connect to the security group.
   * @uniqueItems false
   */
  SecurityGroupIngress?: {
    CidrIp?: string;
    CidrIpv6?: string;
    Description?: string;
    FromPort?: number;
    SourceSecurityGroupName?: string;
    ToPort?: number;
    SourceSecurityGroupOwnerId?: string;
    IpProtocol: string;
    SourceSecurityGroupId?: string;
    SourcePrefixListId?: string;
  }[];
  /**
   * [VPC only] The outbound rules associated with the security group. There is a short interruption
   * during which you cannot connect to the security group.
   * @uniqueItems false
   */
  SecurityGroupEgress?: {
    CidrIp?: string;
    CidrIpv6?: string;
    Description?: string;
    FromPort?: number;
    ToPort?: number;
    IpProtocol: string;
    DestinationSecurityGroupId?: string;
    DestinationPrefixListId?: string;
  }[];
  /**
   * Any tags assigned to the security group.
   * @uniqueItems false
   */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  /** The group ID of the specified security group. */
  GroupId?: string;
};
