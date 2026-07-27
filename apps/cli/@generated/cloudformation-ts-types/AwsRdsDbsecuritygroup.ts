// This file is auto-generated. Do not edit manually.
// Source: aws-rds-dbsecuritygroup.json

/** Resource Type definition for AWS::RDS::DBSecurityGroup */
export type AwsRdsDbsecuritygroup = {
  Id?: string;
  /** @uniqueItems true */
  DBSecurityGroupIngress: {
    CIDRIP?: string;
    EC2SecurityGroupId?: string;
    EC2SecurityGroupName?: string;
    EC2SecurityGroupOwnerId?: string;
  }[];
  EC2VpcId?: string;
  GroupDescription: string;
  /** @uniqueItems false */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
