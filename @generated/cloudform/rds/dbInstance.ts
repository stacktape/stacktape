import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CertificateDetails {
  ValidTill?: Value<string>;
  CAIdentifier?: Value<string>;
  constructor(properties: CertificateDetails) {
    Object.assign(this, properties);
  }
}

export class DBInstanceRole {
  RoleArn!: Value<string>;
  FeatureName!: Value<string>;
  constructor(properties: DBInstanceRole) {
    Object.assign(this, properties);
  }
}

export class DBInstanceStatusInfo {
  Status?: Value<string>;
  Message?: Value<string>;
  StatusType?: Value<string>;
  Normal?: Value<boolean>;
  constructor(properties: DBInstanceStatusInfo) {
    Object.assign(this, properties);
  }
}

export class Endpoint {
  Address?: Value<string>;
  Port?: Value<string>;
  HostedZoneId?: Value<string>;
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

export class ProcessorFeature {
  Value?: Value<string>;
  Name?: Value<string>;
  constructor(properties: ProcessorFeature) {
    Object.assign(this, properties);
  }
}
export interface DBInstanceProperties {
  Timezone?: Value<string>;
  DatabaseInsightsMode?: Value<string>;
  StorageEncrypted?: Value<boolean>;
  DBSystemId?: Value<string>;
  Port?: Value<string>;
  DBClusterIdentifier?: Value<string>;
  StorageThroughput?: Value<number>;
  AutomaticBackupReplicationRetentionPeriod?: Value<number>;
  MasterUserAuthenticationType?: Value<string>;
  MonitoringInterval?: Value<number>;
  DBParameterGroupName?: Value<string>;
  MultiAZ?: Value<boolean>;
  AutomaticBackupReplicationKmsKeyId?: Value<string>;
  Tags?: List<ResourceTag>;
  Engine?: Value<string>;
  PerformanceInsightsKMSKeyId?: Value<string>;
  SourceDBInstanceIdentifier?: Value<string>;
  EngineVersion?: Value<string>;
  StorageType?: Value<string>;
  KmsKeyId?: Value<string>;
  DBInstanceClass?: Value<string>;
  DeleteAutomatedBackups?: Value<boolean>;
  PerformanceInsightsRetentionPeriod?: Value<number>;
  AvailabilityZone?: Value<string>;
  OptionGroupName?: Value<string>;
  EnablePerformanceInsights?: Value<boolean>;
  DBSubnetGroupName?: Value<string>;
  AutoMinorVersionUpgrade?: Value<boolean>;
  DeletionProtection?: Value<boolean>;
  DBInstanceIdentifier?: Value<string>;
  AllocatedStorage?: Value<string>;
  MasterUserPassword?: Value<string>;
  MasterUserSecret?: MasterUserSecret;
  NcharCharacterSetName?: Value<string>;
  SourceDBClusterIdentifier?: Value<string>;
  DBSecurityGroups?: List<Value<string>>;
  MasterUsername?: Value<string>;
  MaxAllocatedStorage?: Value<number>;
  PromotionTier?: Value<number>;
  PubliclyAccessible?: Value<boolean>;
  Domain?: Value<string>;
  ApplyImmediately?: Value<boolean>;
  DomainFqdn?: Value<string>;
  CharacterSetName?: Value<string>;
  MonitoringRoleArn?: Value<string>;
  AssociatedRoles?: List<DBInstanceRole>;
  DomainOu?: Value<string>;
  DBClusterSnapshotIdentifier?: Value<string>;
  SourceDBInstanceAutomatedBackupsArn?: Value<string>;
  ProcessorFeatures?: List<ProcessorFeature>;
  PreferredBackupWindow?: Value<string>;
  RestoreTime?: Value<string>;
  CertificateRotationRestart?: Value<boolean>;
  NetworkType?: Value<string>;
  DedicatedLogVolume?: Value<boolean>;
  CopyTagsToSnapshot?: Value<boolean>;
  DomainIAMRoleName?: Value<string>;
  ReplicaMode?: Value<string>;
  EngineLifecycleSupport?: Value<string>;
  LicenseModel?: Value<string>;
  DomainDnsIps?: List<Value<string>>;
  PreferredMaintenanceWindow?: Value<string>;
  Iops?: Value<number>;
  SourceRegion?: Value<string>;
  BackupTarget?: Value<string>;
  UseLatestRestorableTime?: Value<boolean>;
  CACertificateIdentifier?: Value<string>;
  ManageMasterUserPassword?: Value<boolean>;
  SourceDbiResourceId?: Value<string>;
  DomainAuthSecretArn?: Value<string>;
  VPCSecurityGroups?: List<Value<string>>;
  AutomaticBackupReplicationRegion?: Value<string>;
  AllowMajorVersionUpgrade?: Value<boolean>;
  DBName?: Value<string>;
  EnableIAMDatabaseAuthentication?: Value<boolean>;
  BackupRetentionPeriod?: Value<number>;
  CustomIAMInstanceProfile?: Value<string>;
  DBSnapshotIdentifier?: Value<string>;
  EnableCloudwatchLogsExports?: List<Value<string>>;
  UseDefaultProcessorFeatures?: Value<boolean>;
}
export default class DBInstance extends ResourceBase<DBInstanceProperties> {
  static CertificateDetails = CertificateDetails;
  static DBInstanceRole = DBInstanceRole;
  static DBInstanceStatusInfo = DBInstanceStatusInfo;
  static Endpoint = Endpoint;
  static MasterUserSecret = MasterUserSecret;
  static ProcessorFeature = ProcessorFeature;
  constructor(properties?: DBInstanceProperties) {
    super('AWS::RDS::DBInstance', properties || {});
  }
}
