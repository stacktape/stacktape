// This file is auto-generated. Do not edit manually.
// Source: aws-redshift-scheduledaction.json

/** The `AWS::Redshift::ScheduledAction` resource creates an Amazon Redshift Scheduled Action. */
export type AwsRedshiftScheduledaction = {
  /** The description of the scheduled action. */
  ScheduledActionDescription?: string;
  /** The name of the scheduled action. The name must be unique within an account. */
  ScheduledActionName: string;
  /**
   * The end time in UTC of the scheduled action. After this time, the scheduled action does not
   * trigger.
   */
  EndTime?: string;
  /**
   * The state of the scheduled action.
   * @enum ["ACTIVE","DISABLED"]
   */
  State?: "ACTIVE" | "DISABLED";
  /** The schedule in `at( )` or `cron( )` format. */
  Schedule?: string;
  /** The IAM role to assume to run the target action. */
  IamRole?: string;
  /**
   * The start time in UTC of the scheduled action. Before this time, the scheduled action does not
   * trigger.
   */
  StartTime?: string;
  /** If true, the schedule is enabled. If false, the scheduled action does not trigger. */
  Enable?: boolean;
  /** A JSON format string of the Amazon Redshift API operation with input parameters. */
  TargetAction?: unknown | unknown | unknown;
  /** List of times when the scheduled action will run. */
  NextInvocations?: string[];
};
