// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-securitygroupvpcassociation.json

/** Resource type definition for the AWS::EC2::SecurityGroupVpcAssociation resource */
export type AwsEc2Securitygroupvpcassociation = {
  /** The group ID of the specified security group. */
  GroupId: string;
  /** The ID of the VPC in the security group vpc association. */
  VpcId: string;
  /** The owner of the VPC in the security group vpc association. */
  VpcOwnerId?: string;
  /** The state of the security group vpc association. */
  State?: "associating" | "associated" | "association-failed" | "disassociating" | "disassociated" | "disassociation-failed";
  /** The reason for the state of the security group vpc association. */
  StateReason?: string;
};
