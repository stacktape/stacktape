// This file is auto-generated. Do not edit manually.
// Source: aws-backup-backupplan.json

/** Resource Type definition for AWS::Backup::BackupPlan */
export type AwsBackupBackupplan = {
  BackupPlan: {
    BackupPlanName: string;
    /** @uniqueItems false */
    AdvancedBackupSettings?: {
      BackupOptions: Record<string, unknown>;
      ResourceType: string;
    }[];
    /** @uniqueItems false */
    BackupPlanRule: {
      RuleName: string;
      TargetBackupVault: string;
      TargetLogicallyAirGappedBackupVaultArn?: string;
      StartWindowMinutes?: number;
      CompletionWindowMinutes?: number;
      ScheduleExpression?: string;
      ScheduleExpressionTimezone?: string;
      /** @uniqueItems false */
      IndexActions?: {
        ResourceTypes?: string[];
      }[];
      RecoveryPointTags?: Record<string, string>;
      /** @uniqueItems false */
      CopyActions?: {
        Lifecycle?: {
          MoveToColdStorageAfterDays?: number;
          DeleteAfterDays?: number;
          OptInToArchiveForSupportedResources?: boolean;
        };
        DestinationBackupVaultArn: string;
      }[];
      Lifecycle?: {
        MoveToColdStorageAfterDays?: number;
        DeleteAfterDays?: number;
        OptInToArchiveForSupportedResources?: boolean;
      };
      EnableContinuousBackup?: boolean;
    }[];
  };
  BackupPlanTags?: Record<string, string>;
  BackupPlanArn?: string;
  BackupPlanId?: string;
  VersionId?: string;
};
