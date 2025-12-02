// This file is auto-generated. Do not edit manually.
// Source: aws-dms-replicationsubnetgroup.json

/** Resource Type definition for AWS::DMS::ReplicationSubnetGroup */
export type AwsDmsReplicationsubnetgroup = {
  ReplicationSubnetGroupDescription: string;
  Id?: string;
  ReplicationSubnetGroupIdentifier?: string;
  /** @uniqueItems false */
  SubnetIds: string[];
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
