// This file is auto-generated. Do not edit manually.
// Source: aws-backup-restoretestingplan.json

/** Definition of AWS::Backup::RestoreTestingPlan Resource Type */
export type AwsBackupRestoretestingplan = {
  RecoveryPointSelection: {
    Algorithm: "LATEST_WITHIN_WINDOW" | "RANDOM_WITHIN_WINDOW";
    SelectionWindowDays?: number;
    RecoveryPointTypes: ("SNAPSHOT" | "CONTINUOUS")[];
    IncludeVaults: string[];
    ExcludeVaults?: string[];
  };
  RestoreTestingPlanArn?: string;
  RestoreTestingPlanName: string;
  ScheduleExpression: string;
  ScheduleExpressionTimezone?: string;
  StartWindowHours?: number;
  /** @uniqueItems true */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
