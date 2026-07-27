// This file is auto-generated. Do not edit manually.
// Source: aws-docdb-dbsubnetgroup.json

/** Resource Type definition for AWS::DocDB::DBSubnetGroup */
export type AwsDocdbDbsubnetgroup = {
  Id?: string;
  DBSubnetGroupName?: string;
  DBSubnetGroupDescription: string;
  /** @uniqueItems false */
  SubnetIds: string[];
  /** @uniqueItems false */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
