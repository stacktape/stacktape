// This file is auto-generated. Do not edit manually.
// Source: aws-connect-hoursofoperation.json

/** Resource Type definition for AWS::Connect::HoursOfOperation */
export type AwsConnectHoursofoperation = {
  /**
   * The identifier of the Amazon Connect instance.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*$
   */
  InstanceArn: string;
  /**
   * The name of the hours of operation.
   * @minLength 1
   * @maxLength 127
   */
  Name: string;
  /**
   * The description of the hours of operation.
   * @minLength 1
   * @maxLength 250
   */
  Description?: string;
  /** The time zone of the hours of operation. */
  TimeZone: string;
  /**
   * Configuration information for the hours of operation: day, start time, and end time.
   * @maxItems 100
   * @uniqueItems true
   */
  Config: ({
    /**
     * The day that the hours of operation applies to.
     * @enum ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"]
     */
    Day: "SUNDAY" | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY";
    /** The start time that your contact center opens. */
    StartTime: {
      /**
       * The hours.
       * @minimum 0
       * @maximum 23
       */
      Hours: number;
      /**
       * The minutes.
       * @minimum 0
       * @maximum 59
       */
      Minutes: number;
    };
    /** The end time that your contact center closes. */
    EndTime: {
      /**
       * The hours.
       * @minimum 0
       * @maximum 23
       */
      Hours: number;
      /**
       * The minutes.
       * @minimum 0
       * @maximum 59
       */
      Minutes: number;
    };
  })[];
  /**
   * The Amazon Resource Name (ARN) for the hours of operation.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/operating-hours/[-a-zA-Z0-9]*$
   */
  HoursOfOperationArn?: string;
  /**
   * One or more tags.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is maximum of 256 Unicode characters in length
     * and cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * One or more hours of operation overrides assigned to an hour of operation.
   * @maxItems 50
   */
  HoursOfOperationOverrides?: ({
    OverrideName: string;
    OverrideDescription?: string;
    EffectiveFrom: string;
    EffectiveTill: string;
    OverrideConfig: ({
      /**
       * The day that the hours of operation override applies to.
       * @enum ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"]
       */
      Day: "SUNDAY" | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY";
      /** The new start time that your contact center opens for the overriden days. */
      StartTime: {
        /**
         * The hours.
         * @minimum 0
         * @maximum 23
         */
        Hours: number;
        /**
         * The minutes.
         * @minimum 0
         * @maximum 59
         */
        Minutes: number;
      };
      /** The new end time that your contact center closes for the overriden days. */
      EndTime: {
        /**
         * The hours.
         * @minimum 0
         * @maximum 23
         */
        Hours: number;
        /**
         * The minutes.
         * @minimum 0
         * @maximum 59
         */
        Minutes: number;
      };
    })[];
    HoursOfOperationOverrideId?: string;
  })[];
};
