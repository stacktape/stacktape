// This file is auto-generated. Do not edit manually.
// Source: aws-docdb-dbcluster.json

/** Resource Type definition for AWS::DocDB::DBCluster */
export type AwsDocdbDbcluster = {
  StorageEncrypted?: boolean;
  RestoreToTime?: string;
  SnapshotIdentifier?: string;
  Port?: number;
  DBClusterIdentifier?: string;
  PreferredBackupWindow?: string;
  ClusterResourceId?: string;
  Endpoint?: string;
  RotateMasterUserPassword?: boolean;
  /** @uniqueItems false */
  VpcSecurityGroupIds?: string[];
  NetworkType?: string;
  CopyTagsToSnapshot?: boolean;
  GlobalClusterIdentifier?: string;
  RestoreType?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  EngineVersion?: string;
  StorageType?: string;
  KmsKeyId?: string;
  /** @uniqueItems false */
  AvailabilityZones?: string[];
  ServerlessV2ScalingConfiguration?: {
    MinCapacity: number;
    MaxCapacity: number;
  };
  PreferredMaintenanceWindow?: string;
  MasterUserSecretKmsKeyId?: string;
  DBSubnetGroupName?: string;
  DeletionProtection?: boolean;
  UseLatestRestorableTime?: boolean;
  ManageMasterUserPassword?: boolean;
  MasterUserPassword?: string;
  SourceDBClusterIdentifier?: string;
  MasterUsername?: string;
  ReadEndpoint?: string;
  DBClusterParameterGroupName?: string;
  BackupRetentionPeriod?: number;
  Id?: string;
  /** @uniqueItems false */
  EnableCloudwatchLogsExports?: string[];
};
