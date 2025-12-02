// This file is auto-generated. Do not edit manually.
// Source: aws-arczonalshift-zonalautoshiftconfiguration.json

/** Definition of AWS::ARCZonalShift::ZonalAutoshiftConfiguration Resource Type */
export type AwsArczonalshiftZonalautoshiftconfiguration = {
  ZonalAutoshiftStatus?: "ENABLED";
  PracticeRunConfiguration?: {
    /**
     * @minItems 1
     * @maxItems 1
     */
    BlockingAlarms?: {
      Type: string;
      /**
       * @minLength 8
       * @maxLength 1024
       * @pattern ^.*$
       */
      AlarmIdentifier: string;
    }[];
    /**
     * @minItems 1
     * @maxItems 1
     */
    OutcomeAlarms: {
      Type: string;
      /**
       * @minLength 8
       * @maxLength 1024
       * @pattern ^.*$
       */
      AlarmIdentifier: string;
    }[];
    /**
     * @minItems 0
     * @maxItems 15
     */
    BlockedDates?: string[];
    /**
     * @minItems 0
     * @maxItems 15
     */
    BlockedWindows?: string[];
  };
  /**
   * @minLength 8
   * @maxLength 1024
   */
  ResourceIdentifier?: string;
};
