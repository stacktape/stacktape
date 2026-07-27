// This file is auto-generated. Do not edit manually.
// Source: aws-backup-backupselection.json

/** Resource Type definition for AWS::Backup::BackupSelection */
export type AwsBackupBackupselection = {
  Id?: string;
  BackupPlanId: string;
  BackupSelection: {
    IamRoleArn: string;
    /** @uniqueItems false */
    ListOfTags?: {
      ConditionKey: string;
      ConditionValue: string;
      ConditionType: string;
    }[];
    /** @uniqueItems false */
    Resources?: string[];
    SelectionName: string;
    /** @uniqueItems false */
    NotResources?: string[];
    Conditions?: {
      /** @uniqueItems false */
      StringEquals?: {
        ConditionKey?: string;
        ConditionValue?: string;
      }[];
      /** @uniqueItems false */
      StringNotEquals?: {
        ConditionKey?: string;
        ConditionValue?: string;
      }[];
      /** @uniqueItems false */
      StringLike?: {
        ConditionKey?: string;
        ConditionValue?: string;
      }[];
      /** @uniqueItems false */
      StringNotLike?: {
        ConditionKey?: string;
        ConditionValue?: string;
      }[];
    };
  };
  SelectionId?: string;
};
