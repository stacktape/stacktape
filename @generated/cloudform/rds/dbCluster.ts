import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DBClusterRole {
  RoleArn!: Value<string>;
  FeatureName?: Value<string>;
  constructor(properties: DBClusterRole) {
    Object.assign(this, properties);
  }
}

export class Endpoint {
  Address?: Value<string>;
  Port?: Value<string>;
  constructor(properties: Endpoint) {
    Object.assign(this, properties);
  }
}

export class MasterUserSecret {
  SecretArn?: Value<string>;
  KmsKeyId?: Value<string>;
  constructor(properties: MasterUserSecret) {
    Object.assign(this, properties);
  }
}

export class ReadEndpoint {
  Address?: Value<string>;
  constructor(properties: ReadEndpoint) {
    Object.assign(this, properties);
  }
}

export class ScalingConfiguration {
  TimeoutAction?: Value<string>;
  SecondsBeforeTimeout?: Value<number>;
  SecondsUntilAutoPause?: Value<number>;
  AutoPause?: Value<boolean>;
  MinCapacity?: Value<number>;
  MaxCapacity?: Value<number>;
  constructor(properties: ScalingConfiguration) {
    Object.assign(this, properties);
  }
}

export class ServerlessV2ScalingConfiguration {
  SecondsUntilAutoPause?: Value<number>;
  MinCapacity?: Value<number>;
  MaxCapacity?: Value<number>;
  constructor(properties: ServerlessV2ScalingConfiguration) {
    Object.assign(this, properties);
  }
}
export interface DBClusterProperties {
  DatabaseInsightsMode?: Value<string>;
  StorageEncrypted?: Value<boolean>;
  DBSystemId?: Value<string>;
  RestoreToTime?: Value<string>;
  EngineMode?: Value<string>;
  Port?: Value<number>;
  DBClusterIdentifier?: Value<string>;
  MasterUserAuthenticationType?: Value<string>;
  MonitoringInterval?: Value<number>;
  ReplicationSourceIdentifier?: Value<string>;
  Engine?: Value<string>;
  Tags?: List<ResourceTag>;
  EngineVersion?: Value<string>;
  StorageType?: Value<string>;
  KmsKeyId?: Value<string>;
  ServerlessV2ScalingConfiguration?: ServerlessV2ScalingConfiguration;
  DeleteAutomatedBackups?: Value<boolean>;
  PerformanceInsightsRetentionPeriod?: Value<number>;
  DatabaseName?: Value<string>;
  EnableLocalWriteForwarding?: Value<boolean>;
  AutoMinorVersionUpgrade?: Value<boolean>;
  DBSubnetGroupName?: Value<string>;
  DeletionProtection?: Value<boolean>;
  AllocatedStorage?: Value<number>;
  SourceDbClusterResourceId?: Value<string>;
  MasterUserPassword?: Value<string>;
  MasterUserSecret?: MasterUserSecret;
  SourceDBClusterIdentifier?: Value<string>;
  MasterUsername?: Value<string>;
  ScalingConfiguration?: ScalingConfiguration;
  PerformanceInsightsKmsKeyId?: Value<string>;
  PubliclyAccessible?: Value<boolean>;
  Domain?: Value<string>;
  BacktrackWindow?: Value<number>;
  DBInstanceParameterGroupName?: Value<string>;
  EnableGlobalWriteForwarding?: Value<boolean>;
  MonitoringRoleArn?: Value<string>;
  AssociatedRoles?: List<DBClusterRole>;
  EnableHttpEndpoint?: Value<boolean>;
  SnapshotIdentifier?: Value<string>;
  ClusterScalabilityType?: Value<string>;
  PreferredBackupWindow?: Value<string>;
  NetworkType?: Value<string>;
  VpcSecurityGroupIds?: List<Value<string>>;
  CopyTagsToSnapshot?: Value<boolean>;
  GlobalClusterIdentifier?: Value<string>;
  RestoreType?: Value<string>;
  DomainIAMRoleName?: Value<string>;
  EngineLifecycleSupport?: Value<string>;
  DBClusterInstanceClass?: Value<string>;
  AvailabilityZones?: List<Value<string>>;
  PreferredMaintenanceWindow?: Value<string>;
  Iops?: Value<number>;
  SourceRegion?: Value<string>;
  UseLatestRestorableTime?: Value<boolean>;
  ManageMasterUserPassword?: Value<boolean>;
  EnableIAMDatabaseAuthentication?: Value<boolean>;
  DBClusterParameterGroupName?: Value<string>;
  PerformanceInsightsEnabled?: Value<boolean>;
  BackupRetentionPeriod?: Value<number>;
  EnableCloudwatchLogsExports?: List<Value<string>>;
}
export default class DBCluster extends ResourceBase<DBClusterProperties> {
  static DBClusterRole = DBClusterRole;
  static Endpoint = Endpoint;
  static MasterUserSecret = MasterUserSecret;
  static ReadEndpoint = ReadEndpoint;
  static ScalingConfiguration = ScalingConfiguration;
  static ServerlessV2ScalingConfiguration = ServerlessV2ScalingConfiguration;
  constructor(properties?: DBClusterProperties) {
    super('AWS::RDS::DBCluster', properties || {});
  }
}
