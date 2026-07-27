// This file is auto-generated. Do not edit manually.
// Source: aws-backup-backupvault.json

/** Resource Type definition for AWS::Backup::BackupVault */
export type AwsBackupBackupvault = {
  AccessPolicy?: Record<string, unknown> | string;
  BackupVaultName: string;
  BackupVaultTags?: Record<string, string>;
  EncryptionKeyArn?: string;
  Notifications?: {
    /** @uniqueItems false */
    BackupVaultEvents: string[];
    SNSTopicArn: string;
  };
  LockConfiguration?: {
    MinRetentionDays: number;
    MaxRetentionDays?: number;
    ChangeableForDays?: number;
  };
  BackupVaultArn?: string;
};
