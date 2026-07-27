// This file is auto-generated. Do not edit manually.
// Source: aws-backup-restoretestingselection.json

/** Resource Type definition for AWS::Backup::RestoreTestingSelection */
export type AwsBackupRestoretestingselection = {
  IamRoleArn: string;
  ProtectedResourceArns?: string[];
  ProtectedResourceConditions?: {
    StringEquals?: {
      Key: string;
      Value: string;
    }[];
    StringNotEquals?: {
      Key: string;
      Value: string;
    }[];
  };
  ProtectedResourceType: string;
  RestoreMetadataOverrides?: Record<string, string>;
  RestoreTestingPlanName: string;
  RestoreTestingSelectionName: string;
  ValidationWindowHours?: number;
};
