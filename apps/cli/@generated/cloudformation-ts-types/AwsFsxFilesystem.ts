// This file is auto-generated. Do not edit manually.
// Source: aws-fsx-filesystem.json

/** Resource Type definition for AWS::FSx::FileSystem */
export type AwsFsxFilesystem = {
  StorageType?: string;
  KmsKeyId?: string;
  StorageCapacity?: number;
  RootVolumeId?: string;
  LustreConfiguration?: {
    DriveCacheType?: string;
    AutoImportPolicy?: string;
    EfaEnabled?: boolean;
    ImportedFileChunkSize?: number;
    DeploymentType?: string;
    ThroughputCapacity?: number;
    DataCompressionType?: string;
    DataReadCacheConfiguration?: {
      SizingMode?: string;
      SizeGiB?: number;
    };
    ImportPath?: string;
    WeeklyMaintenanceStartTime?: string;
    MetadataConfiguration?: {
      Mode?: string;
      Iops?: number;
    };
    DailyAutomaticBackupStartTime?: string;
    CopyTagsToBackups?: boolean;
    ExportPath?: string;
    PerUnitStorageThroughput?: number;
    AutomaticBackupRetentionDays?: number;
  };
  BackupId?: string;
  OntapConfiguration?: {
    HAPairs?: number;
    FsxAdminPassword?: string;
    ThroughputCapacityPerHAPair?: number;
    DeploymentType: string;
    ThroughputCapacity?: number;
    EndpointIpAddressRange?: string;
    /** @uniqueItems false */
    RouteTableIds?: string[];
    WeeklyMaintenanceStartTime?: string;
    DiskIopsConfiguration?: {
      Mode?: string;
      Iops?: number;
    };
    DailyAutomaticBackupStartTime?: string;
    AutomaticBackupRetentionDays?: number;
    EndpointIpv6AddressRange?: string;
    PreferredSubnetId?: string;
  };
  DNSName?: string;
  /** @uniqueItems false */
  SubnetIds: string[];
  /** @uniqueItems false */
  SecurityGroupIds?: string[];
  WindowsConfiguration?: {
    SelfManagedActiveDirectoryConfiguration?: {
      FileSystemAdministratorsGroup?: string;
      UserName?: string;
      DomainName?: string;
      OrganizationalUnitDistinguishedName?: string;
      DomainJoinServiceAccountSecret?: string;
      /** @uniqueItems false */
      DnsIps?: string[];
      Password?: string;
    };
    AuditLogConfiguration?: {
      FileAccessAuditLogLevel: string;
      FileShareAccessAuditLogLevel: string;
      AuditLogDestination?: string;
    };
    ActiveDirectoryId?: string;
    DeploymentType?: string;
    /** @uniqueItems false */
    Aliases?: string[];
    ThroughputCapacity: number;
    WeeklyMaintenanceStartTime?: string;
    DiskIopsConfiguration?: {
      Mode?: string;
      Iops?: number;
    };
    CopyTagsToBackups?: boolean;
    DailyAutomaticBackupStartTime?: string;
    AutomaticBackupRetentionDays?: number;
    PreferredSubnetId?: string;
  };
  FileSystemTypeVersion?: string;
  OpenZFSConfiguration?: {
    /** @uniqueItems false */
    Options?: string[];
    CopyTagsToVolumes?: boolean;
    DeploymentType: string;
    ThroughputCapacity?: number;
    RootVolumeConfiguration?: {
      ReadOnly?: boolean;
      DataCompressionType?: string;
      /** @uniqueItems false */
      NfsExports?: {
        /** @uniqueItems false */
        ClientConfigurations?: {
          Clients?: string;
          /** @uniqueItems false */
          Options?: string[];
        }[];
      }[];
      CopyTagsToSnapshots?: boolean;
      RecordSizeKiB?: number;
      /** @uniqueItems false */
      UserAndGroupQuotas?: {
        Type?: string;
        Id?: number;
        StorageCapacityQuotaGiB?: number;
      }[];
    };
    EndpointIpAddressRange?: string;
    ReadCacheConfiguration?: {
      SizingMode?: string;
      SizeGiB?: number;
    };
    /** @uniqueItems false */
    RouteTableIds?: string[];
    WeeklyMaintenanceStartTime?: string;
    DiskIopsConfiguration?: {
      Mode?: string;
      Iops?: number;
    };
    DailyAutomaticBackupStartTime?: string;
    CopyTagsToBackups?: boolean;
    AutomaticBackupRetentionDays?: number;
    EndpointIpv6AddressRange?: string;
    PreferredSubnetId?: string;
  };
  ResourceARN?: string;
  NetworkType?: string;
  FileSystemType: string;
  Id?: string;
  LustreMountName?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
