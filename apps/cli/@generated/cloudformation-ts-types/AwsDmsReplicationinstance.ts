// This file is auto-generated. Do not edit manually.
// Source: aws-dms-replicationinstance.json

/** Resource Type definition for AWS::DMS::ReplicationInstance */
export type AwsDmsReplicationinstance = {
  DnsNameServers?: string;
  ReplicationInstanceIdentifier?: string;
  EngineVersion?: string;
  KmsKeyId?: string;
  AvailabilityZone?: string;
  PreferredMaintenanceWindow?: string;
  AutoMinorVersionUpgrade?: boolean;
  ReplicationSubnetGroupIdentifier?: string;
  ReplicationInstancePrivateIpAddresses?: string;
  AllocatedStorage?: number;
  ResourceIdentifier?: string;
  /** @uniqueItems false */
  VpcSecurityGroupIds?: string[];
  NetworkType?: string;
  AllowMajorVersionUpgrade?: boolean;
  ReplicationInstanceClass: string;
  PubliclyAccessible?: boolean;
  Id?: string;
  MultiAZ?: boolean;
  ReplicationInstancePublicIpAddresses?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
