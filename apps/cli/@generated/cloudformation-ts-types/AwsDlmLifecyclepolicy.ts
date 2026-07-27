// This file is auto-generated. Do not edit manually.
// Source: aws-dlm-lifecyclepolicy.json

/** Resource Type definition for AWS::DLM::LifecyclePolicy */
export type AwsDlmLifecyclepolicy = {
  CreateInterval?: number;
  Description?: string;
  ExtendDeletion?: boolean;
  Exclusions?: {
    ExcludeTags?: Record<string, unknown>;
    ExcludeVolumeTypes?: Record<string, unknown>;
    ExcludeBootVolumes?: boolean;
  };
  RetainInterval?: number;
  ExecutionRoleArn?: string;
  DefaultPolicy?: string;
  State?: string;
  CrossRegionCopyTargets?: Record<string, unknown>;
  PolicyDetails?: {
    PolicyLanguage?: string;
    /** @uniqueItems false */
    ResourceTypes?: string[];
    /** @uniqueItems false */
    Schedules?: {
      /** @uniqueItems false */
      ShareRules?: {
        /** @uniqueItems false */
        TargetAccounts?: string[];
        UnshareIntervalUnit?: string;
        UnshareInterval?: number;
      }[];
      DeprecateRule?: {
        IntervalUnit?: string;
        Count?: number;
        Interval?: number;
      };
      /** @uniqueItems false */
      TagsToAdd?: {
        Value: string;
        Key: string;
      }[];
      CreateRule?: {
        IntervalUnit?: string;
        /** @uniqueItems false */
        Scripts?: {
          ExecutionHandlerService?: string;
          ExecutionTimeout?: number;
          /** @uniqueItems false */
          Stages?: string[];
          ExecutionHandler?: string;
          MaximumRetryCount?: number;
          ExecuteOperationOnScriptFailure?: boolean;
        }[];
        /** @uniqueItems false */
        Times?: string[];
        CronExpression?: string;
        Interval?: number;
        Location?: string;
      };
      /** @uniqueItems false */
      VariableTags?: {
        Value: string;
        Key: string;
      }[];
      FastRestoreRule?: {
        IntervalUnit?: string;
        Count?: number;
        /** @uniqueItems false */
        AvailabilityZones?: string[];
        Interval?: number;
      };
      ArchiveRule?: {
        RetainRule: {
          RetentionArchiveTier: {
            IntervalUnit?: string;
            Count?: number;
            Interval?: number;
          };
        };
      };
      RetainRule?: {
        IntervalUnit?: string;
        Count?: number;
        Interval?: number;
      };
      /** @uniqueItems false */
      CrossRegionCopyRules?: {
        TargetRegion?: string;
        Target?: string;
        DeprecateRule?: {
          IntervalUnit: string;
          Interval: number;
        };
        Encrypted: boolean;
        CmkArn?: string;
        RetainRule?: {
          IntervalUnit: string;
          Interval: number;
        };
        CopyTags?: boolean;
      }[];
      Name?: string;
      CopyTags?: boolean;
    }[];
    PolicyType?: string;
    CreateInterval?: number;
    Parameters?: {
      ExcludeBootVolume?: boolean;
      NoReboot?: boolean;
      /** @uniqueItems false */
      ExcludeDataVolumeTags?: {
        Value: string;
        Key: string;
      }[];
    };
    ExtendDeletion?: boolean;
    Exclusions?: {
      ExcludeTags?: Record<string, unknown>;
      ExcludeVolumeTypes?: Record<string, unknown>;
      ExcludeBootVolumes?: boolean;
    };
    /** @uniqueItems false */
    Actions?: {
      /** @uniqueItems false */
      CrossRegionCopy: {
        Target: string;
        EncryptionConfiguration: {
          Encrypted: boolean;
          CmkArn?: string;
        };
        RetainRule?: {
          IntervalUnit: string;
          Interval: number;
        };
      }[];
      Name: string;
    }[];
    ResourceType?: string;
    RetainInterval?: number;
    EventSource?: {
      Type: string;
      Parameters?: {
        DescriptionRegex?: string;
        EventType: string;
        /** @uniqueItems false */
        SnapshotOwner: string[];
      };
    };
    CrossRegionCopyTargets?: Record<string, unknown>;
    /** @uniqueItems false */
    TargetTags?: {
      Value: string;
      Key: string;
    }[];
    /** @uniqueItems false */
    ResourceLocations?: string[];
    CopyTags?: boolean;
  };
  Id?: string;
  Arn?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  CopyTags?: boolean;
};
