// This file is auto-generated. Do not edit manually.
// Source: aws-cloudtrail-dashboard.json

/**
 * The Amazon CloudTrail dashboard resource allows customers to manage managed dashboards and create
 * custom dashboards. You can manually refresh custom and managed dashboards. For custom dashboards,
 * you can also set up an automatic refresh schedule and modify dashboard widgets.
 */
export type AwsCloudtrailDashboard = {
  /**
   * List of widgets on the dashboard
   * @uniqueItems true
   */
  Widgets?: {
    /**
     * The SQL query statement on one or more event data stores.
     * @minLength 1
     * @maxLength 10000
     * @pattern (?s).*
     */
    QueryStatement: string;
    /**
     * The placeholder keys in the QueryStatement. For example: $StartTime$, $EndTime$, $Period$.
     * @minItems 1
     * @maxItems 10
     * @uniqueItems false
     */
    QueryParameters?: string[];
    /** The view properties of the widget. */
    ViewProperties?: Record<string, string>;
  }[];
  /** The timestamp of the dashboard creation. */
  CreatedTimestamp?: string;
  /**
   * The ARN of the dashboard.
   * @pattern ^[a-zA-Z0-9._/\-:]+$
   */
  DashboardArn?: string;
  /**
   * Configures the automatic refresh schedule for the dashboard. Includes the frequency unit (DAYS or
   * HOURS) and value, as well as the status (ENABLED or DISABLED) of the refresh schedule.
   */
  RefreshSchedule?: {
    Frequency?: {
      /**
       * The frequency unit. Supported values are HOURS and DAYS.
       * @enum ["HOURS","DAYS"]
       */
      Unit: "HOURS" | "DAYS";
      /** The frequency value. */
      Value: number;
    };
    /**
     * StartTime of the automatic schedule refresh.
     * @pattern ^[0-9]{2}:[0-9]{2}
     */
    TimeOfDay?: string;
    /**
     * The status of the schedule. Supported values are ENABLED and DISABLED.
     * @enum ["ENABLED","DISABLED"]
     */
    Status?: "ENABLED" | "DISABLED";
  };
  /**
   * The name of the dashboard.
   * @pattern ^[a-zA-Z0-9_\-]+$
   */
  Name?: string;
  /**
   * The status of the dashboard. Values are CREATING, CREATED, UPDATING, UPDATED and DELETING.
   * @enum ["CREATING","CREATED","UPDATING","UPDATED","DELETING"]
   */
  Status?: "CREATING" | "CREATED" | "UPDATING" | "UPDATED" | "DELETING";
  /** Indicates whether the dashboard is protected from termination. */
  TerminationProtectionEnabled?: boolean;
  /**
   * The type of the dashboard. Values are CUSTOM and MANAGED.
   * @enum ["MANAGED","CUSTOM"]
   */
  Type?: "MANAGED" | "CUSTOM";
  /**
   * The timestamp showing when the dashboard was updated, if applicable. UpdatedTimestamp is always
   * either the same or newer than the time shown in CreatedTimestamp.
   */
  UpdatedTimestamp?: string;
  /** @uniqueItems false */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Value: string;
  }[];
};
