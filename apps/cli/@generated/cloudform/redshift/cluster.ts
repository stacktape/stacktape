import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Endpoint {
  Address?: Value<string>;
  Port?: Value<string>;
  constructor(properties: Endpoint) {
    Object.assign(this, properties);
  }
}

export class LoggingProperties {
  BucketName?: Value<string>;
  S3KeyPrefix?: Value<string>;
  LogDestinationType?: Value<string>;
  LogExports?: List<Value<string>>;
  constructor(properties: LoggingProperties) {
    Object.assign(this, properties);
  }
}
export interface ClusterProperties {
  RevisionTarget?: Value<string>;
  AutomatedSnapshotRetentionPeriod?: Value<number>;
  Encrypted?: Value<boolean>;
  Port?: Value<number>;
  NumberOfNodes?: Value<number>;
  DestinationRegion?: Value<string>;
  AllowVersionUpgrade?: Value<boolean>;
  Endpoint?: Endpoint;
  NamespaceResourcePolicy?: { [key: string]: any };
  MaintenanceTrackName?: Value<string>;
  OwnerAccount?: Value<string>;
  MultiAZ?: Value<boolean>;
  Tags?: List<ResourceTag>;
  SnapshotClusterIdentifier?: Value<string>;
  IamRoles?: List<Value<string>>;
  KmsKeyId?: Value<string>;
  SnapshotCopyManual?: Value<boolean>;
  ManageMasterPassword?: Value<boolean>;
  AvailabilityZone?: Value<string>;
  ClusterSecurityGroups?: List<Value<string>>;
  ClusterIdentifier?: Value<string>;
  MasterUserPassword?: Value<string>;
  ClusterSubnetGroupName?: Value<string>;
  LoggingProperties?: LoggingProperties;
  DeferMaintenance?: Value<boolean>;
  NodeType: Value<string>;
  MasterUsername: Value<string>;
  PubliclyAccessible?: Value<boolean>;
  ManualSnapshotRetentionPeriod?: Value<number>;
  ResourceAction?: Value<string>;
  HsmClientCertificateIdentifier?: Value<string>;
  ElasticIp?: Value<string>;
  AvailabilityZoneRelocationStatus?: Value<string>;
  AquaConfigurationStatus?: Value<string>;
  SnapshotIdentifier?: Value<string>;
  AvailabilityZoneRelocation?: Value<boolean>;
  SnapshotCopyGrantName?: Value<string>;
  EnhancedVpcRouting?: Value<boolean>;
  ClusterParameterGroupName?: Value<string>;
  DeferMaintenanceEndTime?: Value<string>;
  RotateEncryptionKey?: Value<boolean>;
  VpcSecurityGroupIds?: List<Value<string>>;
  ClusterVersion?: Value<string>;
  HsmConfigurationIdentifier?: Value<string>;
  PreferredMaintenanceWindow?: Value<string>;
  DeferMaintenanceStartTime?: Value<string>;
  ClusterType: Value<string>;
  Classic?: Value<boolean>;
  MasterPasswordSecretKmsKeyId?: Value<string>;
  DeferMaintenanceDuration?: Value<number>;
  DBName: Value<string>;
  SnapshotCopyRetentionPeriod?: Value<number>;
}
export default class Cluster extends ResourceBase<ClusterProperties> {
  static Endpoint = Endpoint;
  static LoggingProperties = LoggingProperties;
  constructor(properties: ClusterProperties) {
    super('AWS::Redshift::Cluster', properties);
  }
}
