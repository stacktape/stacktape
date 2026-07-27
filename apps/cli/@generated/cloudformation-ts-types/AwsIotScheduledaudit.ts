// This file is auto-generated. Do not edit manually.
// Source: aws-iot-scheduledaudit.json

/**
 * Scheduled audits can be used to specify the checks you want to perform during an audit and how
 * often the audit should be run.
 */
export type AwsIotScheduledaudit = {
  /**
   * The name you want to give to the scheduled audit.
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9:_-]+
   */
  ScheduledAuditName?: string;
  /**
   * How often the scheduled audit takes place. Can be one of DAILY, WEEKLY, BIWEEKLY, or MONTHLY.
   * @enum ["DAILY","WEEKLY","BIWEEKLY","MONTHLY"]
   */
  Frequency: "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  /**
   * The day of the month on which the scheduled audit takes place. Can be 1 through 31 or LAST. This
   * field is required if the frequency parameter is set to MONTHLY.
   * @pattern ^([1-9]|[12][0-9]|3[01])$|^LAST$|^UNSET_VALUE$
   */
  DayOfMonth?: string;
  /**
   * The day of the week on which the scheduled audit takes place. Can be one of SUN, MON, TUE,WED, THU,
   * FRI, or SAT. This field is required if the frequency parameter is set to WEEKLY or BIWEEKLY.
   * @enum ["SUN","MON","TUE","WED","THU","FRI","SAT","UNSET_VALUE"]
   */
  DayOfWeek?: "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "UNSET_VALUE";
  /**
   * Which checks are performed during the scheduled audit. Checks must be enabled for your account.
   * @uniqueItems true
   */
  TargetCheckNames: string[];
  /**
   * The ARN (Amazon resource name) of the scheduled audit.
   * @minLength 20
   * @maxLength 2048
   */
  ScheduledAuditArn?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The tag's key.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The tag's value.
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
