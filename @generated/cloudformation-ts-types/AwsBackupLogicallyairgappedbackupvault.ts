// This file is auto-generated. Do not edit manually.
// Source: aws-backup-logicallyairgappedbackupvault.json

/** Resource Type definition for AWS::Backup::LogicallyAirGappedBackupVault */
export type AwsBackupLogicallyairgappedbackupvault = {
  AccessPolicy?: Record<string, unknown> | string;
  BackupVaultName: string;
  MinRetentionDays: number;
  MaxRetentionDays: number;
  BackupVaultTags?: Record<string, string>;
  Notifications?: {
    /** @uniqueItems false */
    BackupVaultEvents: string[];
    SNSTopicArn: string;
  };
  EncryptionKeyArn?: string;
  BackupVaultArn?: string;
  VaultState?: string;
  VaultType?: string;
  MpaApprovalTeamArn?: string;
};
