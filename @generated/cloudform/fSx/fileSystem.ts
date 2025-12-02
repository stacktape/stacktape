import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AuditLogConfiguration {
  FileAccessAuditLogLevel!: Value<string>;
  FileShareAccessAuditLogLevel!: Value<string>;
  AuditLogDestination?: Value<string>;
  constructor(properties: AuditLogConfiguration) {
    Object.assign(this, properties);
  }
}

export class ClientConfigurations {
  Options?: List<Value<string>>;
  Clients?: Value<string>;
  constructor(properties: ClientConfigurations) {
    Object.assign(this, properties);
  }
}

export class DataReadCacheConfiguration {
  SizingMode?: Value<string>;
  SizeGiB?: Value<number>;
  constructor(properties: DataReadCacheConfiguration) {
    Object.assign(this, properties);
  }
}

export class DiskIopsConfiguration {
  Mode?: Value<string>;
  Iops?: Value<number>;
  constructor(properties: DiskIopsConfiguration) {
    Object.assign(this, properties);
  }
}

export class LustreConfiguration {
  DriveCacheType?: Value<string>;
  AutoImportPolicy?: Value<string>;
  EfaEnabled?: Value<boolean>;
  ImportedFileChunkSize?: Value<number>;
  DeploymentType?: Value<string>;
  ThroughputCapacity?: Value<number>;
  DataCompressionType?: Value<string>;
  DataReadCacheConfiguration?: DataReadCacheConfiguration;
  ImportPath?: Value<string>;
  WeeklyMaintenanceStartTime?: Value<string>;
  MetadataConfiguration?: MetadataConfiguration;
  DailyAutomaticBackupStartTime?: Value<string>;
  CopyTagsToBackups?: Value<boolean>;
  ExportPath?: Value<string>;
  PerUnitStorageThroughput?: Value<number>;
  AutomaticBackupRetentionDays?: Value<number>;
  constructor(properties: LustreConfiguration) {
    Object.assign(this, properties);
  }
}

export class MetadataConfiguration {
  Mode?: Value<string>;
  Iops?: Value<number>;
  constructor(properties: MetadataConfiguration) {
    Object.assign(this, properties);
  }
}

export class NfsExports {
  ClientConfigurations?: List<ClientConfigurations>;
  constructor(properties: NfsExports) {
    Object.assign(this, properties);
  }
}

export class OntapConfiguration {
  HAPairs?: Value<number>;
  FsxAdminPassword?: Value<string>;
  ThroughputCapacityPerHAPair?: Value<number>;
  DeploymentType!: Value<string>;
  ThroughputCapacity?: Value<number>;
  EndpointIpAddressRange?: Value<string>;
  RouteTableIds?: List<Value<string>>;
  WeeklyMaintenanceStartTime?: Value<string>;
  DiskIopsConfiguration?: DiskIopsConfiguration;
  DailyAutomaticBackupStartTime?: Value<string>;
  AutomaticBackupRetentionDays?: Value<number>;
  EndpointIpv6AddressRange?: Value<string>;
  PreferredSubnetId?: Value<string>;
  constructor(properties: OntapConfiguration) {
    Object.assign(this, properties);
  }
}

export class OpenZFSConfiguration {
  Options?: List<Value<string>>;
  CopyTagsToVolumes?: Value<boolean>;
  DeploymentType!: Value<string>;
  ThroughputCapacity?: Value<number>;
  RootVolumeConfiguration?: RootVolumeConfiguration;
  EndpointIpAddressRange?: Value<string>;
  ReadCacheConfiguration?: ReadCacheConfiguration;
  RouteTableIds?: List<Value<string>>;
  WeeklyMaintenanceStartTime?: Value<string>;
  DiskIopsConfiguration?: DiskIopsConfiguration;
  DailyAutomaticBackupStartTime?: Value<string>;
  CopyTagsToBackups?: Value<boolean>;
  AutomaticBackupRetentionDays?: Value<number>;
  EndpointIpv6AddressRange?: Value<string>;
  PreferredSubnetId?: Value<string>;
  constructor(properties: OpenZFSConfiguration) {
    Object.assign(this, properties);
  }
}

export class ReadCacheConfiguration {
  SizingMode?: Value<string>;
  SizeGiB?: Value<number>;
  constructor(properties: ReadCacheConfiguration) {
    Object.assign(this, properties);
  }
}

export class RootVolumeConfiguration {
  ReadOnly?: Value<boolean>;
  DataCompressionType?: Value<string>;
  NfsExports?: List<NfsExports>;
  CopyTagsToSnapshots?: Value<boolean>;
  RecordSizeKiB?: Value<number>;
  UserAndGroupQuotas?: List<UserAndGroupQuotas>;
  constructor(properties: RootVolumeConfiguration) {
    Object.assign(this, properties);
  }
}

export class SelfManagedActiveDirectoryConfiguration {
  FileSystemAdministratorsGroup?: Value<string>;
  UserName?: Value<string>;
  DomainName?: Value<string>;
  OrganizationalUnitDistinguishedName?: Value<string>;
  DnsIps?: List<Value<string>>;
  Password?: Value<string>;
  constructor(properties: SelfManagedActiveDirectoryConfiguration) {
    Object.assign(this, properties);
  }
}

export class UserAndGroupQuotas {
  Type?: Value<string>;
  Id?: Value<number>;
  StorageCapacityQuotaGiB?: Value<number>;
  constructor(properties: UserAndGroupQuotas) {
    Object.assign(this, properties);
  }
}

export class WindowsConfiguration {
  SelfManagedActiveDirectoryConfiguration?: SelfManagedActiveDirectoryConfiguration;
  AuditLogConfiguration?: AuditLogConfiguration;
  WeeklyMaintenanceStartTime?: Value<string>;
  ActiveDirectoryId?: Value<string>;
  DiskIopsConfiguration?: DiskIopsConfiguration;
  DeploymentType?: Value<string>;
  Aliases?: List<Value<string>>;
  ThroughputCapacity!: Value<number>;
  CopyTagsToBackups?: Value<boolean>;
  DailyAutomaticBackupStartTime?: Value<string>;
  AutomaticBackupRetentionDays?: Value<number>;
  PreferredSubnetId?: Value<string>;
  constructor(properties: WindowsConfiguration) {
    Object.assign(this, properties);
  }
}
export interface FileSystemProperties {
  StorageType?: Value<string>;
  KmsKeyId?: Value<string>;
  StorageCapacity?: Value<number>;
  LustreConfiguration?: LustreConfiguration;
  BackupId?: Value<string>;
  OntapConfiguration?: OntapConfiguration;
  SubnetIds: List<Value<string>>;
  SecurityGroupIds?: List<Value<string>>;
  WindowsConfiguration?: WindowsConfiguration;
  FileSystemTypeVersion?: Value<string>;
  OpenZFSConfiguration?: OpenZFSConfiguration;
  NetworkType?: Value<string>;
  FileSystemType: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class FileSystem extends ResourceBase<FileSystemProperties> {
  static AuditLogConfiguration = AuditLogConfiguration;
  static ClientConfigurations = ClientConfigurations;
  static DataReadCacheConfiguration = DataReadCacheConfiguration;
  static DiskIopsConfiguration = DiskIopsConfiguration;
  static LustreConfiguration = LustreConfiguration;
  static MetadataConfiguration = MetadataConfiguration;
  static NfsExports = NfsExports;
  static OntapConfiguration = OntapConfiguration;
  static OpenZFSConfiguration = OpenZFSConfiguration;
  static ReadCacheConfiguration = ReadCacheConfiguration;
  static RootVolumeConfiguration = RootVolumeConfiguration;
  static SelfManagedActiveDirectoryConfiguration = SelfManagedActiveDirectoryConfiguration;
  static UserAndGroupQuotas = UserAndGroupQuotas;
  static WindowsConfiguration = WindowsConfiguration;
  constructor(properties: FileSystemProperties) {
    super('AWS::FSx::FileSystem', properties);
  }
}
