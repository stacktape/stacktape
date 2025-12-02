// This file is auto-generated. Do not edit manually.
// Source: aws-autoscaling-scheduledaction.json

/**
 * The AWS::AutoScaling::ScheduledAction resource specifies an Amazon EC2 Auto Scaling scheduled
 * action so that the Auto Scaling group can change the number of instances available for your
 * application in response to predictable load changes.
 */
export type AwsAutoscalingScheduledaction = {
  /** Auto-generated unique identifier */
  ScheduledActionName?: string;
  /** The minimum size of the Auto Scaling group. */
  MinSize?: number;
  /**
   * The recurring schedule for the action, in Unix cron syntax format. When StartTime and EndTime are
   * specified with Recurrence , they form the boundaries of when the recurring action starts and stops.
   */
  Recurrence?: string;
  /** The time zone for the cron expression. */
  TimeZone?: string;
  /**
   * The latest scheduled start time to return. If scheduled action names are provided, this parameter
   * is ignored.
   */
  EndTime?: string;
  /** The name of the Auto Scaling group. */
  AutoScalingGroupName: string;
  /**
   * The earliest scheduled start time to return. If scheduled action names are provided, this parameter
   * is ignored.
   */
  StartTime?: string;
  /**
   * The desired capacity is the initial capacity of the Auto Scaling group after the scheduled action
   * runs and the capacity it attempts to maintain.
   */
  DesiredCapacity?: number;
  /** The minimum size of the Auto Scaling group. */
  MaxSize?: number;
};
