// This file is auto-generated. Do not edit manually.
// Source: aws-scheduler-schedulegroup.json

/** Definition of AWS::Scheduler::ScheduleGroup Resource Type */
export type AwsSchedulerSchedulegroup = {
  /**
   * The Amazon Resource Name (ARN) of the schedule group.
   * @minLength 1
   * @maxLength 1224
   * @pattern ^arn:aws[a-z-]*:scheduler:[a-z0-9\-]+:\d{12}:schedule-group\/[0-9a-zA-Z-_.]+$
   */
  Arn?: string;
  /** The time at which the schedule group was created. */
  CreationDate?: string;
  /** The time at which the schedule group was last modified. */
  LastModificationDate?: string;
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[0-9a-zA-Z-_.]+$
   */
  Name?: string;
  State?: "ACTIVE" | "DELETING";
  /**
   * The list of tags to associate with the schedule group.
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * Key for the tag
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * Value for the tag
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
