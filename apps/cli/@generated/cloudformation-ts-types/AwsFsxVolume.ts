// This file is auto-generated. Do not edit manually.
// Source: aws-fsx-volume.json

/** Resource Type definition for AWS::FSx::Volume */
export type AwsFsxVolume = {
  OpenZFSConfiguration?: {
    ReadOnly?: boolean;
    /** @uniqueItems false */
    Options?: string[];
    DataCompressionType?: string;
    /** @uniqueItems false */
    NfsExports?: {
      /** @uniqueItems false */
      ClientConfigurations: {
        Clients: string;
        /** @uniqueItems false */
        Options: string[];
      }[];
    }[];
    StorageCapacityQuotaGiB?: number;
    CopyTagsToSnapshots?: boolean;
    ParentVolumeId: string;
    StorageCapacityReservationGiB?: number;
    RecordSizeKiB?: number;
    OriginSnapshot?: {
      SnapshotARN: string;
      CopyStrategy: string;
    };
    /** @uniqueItems false */
    UserAndGroupQuotas?: {
      Type: string;
      Id: number;
      StorageCapacityQuotaGiB: number;
    }[];
  };
  ResourceARN?: string;
  VolumeId?: string;
  VolumeType?: string;
  BackupId?: string;
  OntapConfiguration?: {
    JunctionPath?: string;
    StorageVirtualMachineId: string;
    TieringPolicy?: {
      CoolingPeriod?: number;
      Name?: string;
    };
    SizeInMegabytes?: string;
    VolumeStyle?: string;
    SizeInBytes?: string;
    SecurityStyle?: string;
    SnaplockConfiguration?: {
      AuditLogVolume?: string;
      VolumeAppendModeEnabled?: string;
      AutocommitPeriod?: {
        Value?: number;
        Type: string;
      };
      RetentionPeriod?: {
        MinimumRetention: {
          Value?: number;
          Type: string;
        };
        DefaultRetention: {
          Value?: number;
          Type: string;
        };
        MaximumRetention: {
          Value?: number;
          Type: string;
        };
      };
      PrivilegedDelete?: string;
      SnaplockType: string;
    };
    AggregateConfiguration?: {
      /** @uniqueItems false */
      Aggregates?: string[];
      ConstituentsPerAggregate?: number;
    };
    SnapshotPolicy?: string;
    StorageEfficiencyEnabled?: string;
    CopyTagsToBackups?: string;
    OntapVolumeType?: string;
  };
  UUID?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  Name: string;
};
