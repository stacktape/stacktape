// This file is auto-generated. Do not edit manually.
// Source: aws-quicksight-refreshschedule.json

/** Definition of the AWS::QuickSight::RefreshSchedule Resource Type. */
export type AwsQuicksightRefreshschedule = {
  /** <p>The Amazon Resource Name (ARN) of the data source.</p> */
  Arn?: string;
  /**
   * @minLength 12
   * @maxLength 12
   * @pattern ^[0-9]{12}$
   */
  AwsAccountId?: string;
  DataSetId?: string;
  Schedule?: {
    /**
     * <p>An unique identifier for the refresh schedule.</p>
     * @minLength 1
     * @maxLength 128
     */
    ScheduleId?: string;
    /** <p>Information about the schedule frequency.</p> */
    ScheduleFrequency?: {
      /** @enum ["MINUTE15","MINUTE30","HOURLY","DAILY","WEEKLY","MONTHLY"] */
      Interval?: "MINUTE15" | "MINUTE30" | "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY";
      /** <p>The day scheduled for refresh.</p> */
      RefreshOnDay?: {
        /** @enum ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"] */
        DayOfWeek?: "SUNDAY" | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY";
        /**
         * <p>The Day Of Month for scheduled refresh.</p>
         * @minLength 1
         * @maxLength 128
         */
        DayOfMonth?: string;
      };
      /**
       * <p>The timezone for scheduled refresh.</p>
       * @minLength 1
       * @maxLength 128
       */
      TimeZone?: string;
      /**
       * <p>The time of the day for scheduled refresh.</p>
       * @minLength 1
       * @maxLength 128
       */
      TimeOfTheDay?: string;
    };
    /**
     * <p>The date time after which refresh is to be scheduled</p>
     * @minLength 1
     * @maxLength 128
     */
    StartAfterDateTime?: string;
    /** @enum ["FULL_REFRESH","INCREMENTAL_REFRESH"] */
    RefreshType?: "FULL_REFRESH" | "INCREMENTAL_REFRESH";
  };
};
