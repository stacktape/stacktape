// This file is auto-generated. Do not edit manually.
// Source: aws-applicationsignals-servicelevelobjective.json

/** Resource Type definition for AWS::ApplicationSignals::ServiceLevelObjective */
export type AwsApplicationsignalsServicelevelobjective = {
  /**
   * The ARN of this SLO.
   * @pattern ^arn:[^:]*:application-signals:[^:]*:[^:]*:slo\/[0-9A-Za-z][-._0-9A-Za-z ]{0,126}[0-9A-Za-z]$
   */
  Arn?: string;
  /**
   * The name of this SLO.
   * @pattern ^[0-9A-Za-z][-._0-9A-Za-z ]{0,126}[0-9A-Za-z]$
   */
  Name: string;
  /**
   * An optional description for this SLO. Default is 'No description'
   * @default "No description"
   * @minLength 1
   * @maxLength 1024
   */
  Description?: string;
  /**
   * Epoch time in seconds of the time that this SLO was created
   * @minimum 946684800
   */
  CreatedTime?: number;
  /**
   * Epoch time in seconds of the time that this SLO was most recently updated
   * @minimum 946684800
   */
  LastUpdatedTime?: number;
  Sli?: {
    SliMetric: {
      KeyAttributes?: unknown;
      /**
       * If the SLO monitors a specific operation of the service, this field displays that operation name.
       * @minLength 1
       * @maxLength 255
       */
      OperationName?: string;
      /**
       * If the SLO monitors either the LATENCY or AVAILABILITY metric that Application Signals collects,
       * this field displays which of those metrics is used.
       * @enum ["LATENCY","AVAILABILITY"]
       */
      MetricType?: "LATENCY" | "AVAILABILITY";
      /**
       * The statistic to use for comparison to the threshold. It can be any CloudWatch statistic or
       * extended statistic
       * @minLength 1
       * @maxLength 20
       */
      Statistic?: string;
      /**
       * The number of seconds to use as the period for SLO evaluation. Your application's performance is
       * compared to the SLI during each period. For each period, the application is determined to have
       * either achieved or not achieved the necessary performance.
       * @minimum 60
       * @maximum 900
       */
      PeriodSeconds?: number;
      MetricDataQueries?: {
        /**
         * A metric to be used directly for the SLO, or to be used in the math expression that will be used
         * for the SLO. Within one MetricDataQuery, you must specify either Expression or MetricStat but not
         * both.
         */
        MetricStat?: {
          /** The granularity, in seconds, to be used for the metric. */
          Period: number;
          Metric: {
            /** The name of the metric to use. */
            MetricName?: string;
            /**
             * An array of one or more dimensions to use to define the metric that you want to use.
             * @uniqueItems false
             */
            Dimensions?: {
              /**
               * The value of the dimension. Dimension values must contain only ASCII characters and must include at
               * least one non-whitespace character. ASCII control characters are not supported as part of dimension
               * values
               */
              Value: string;
              /**
               * The name of the dimension. Dimension names must contain only ASCII characters, must include at
               * least one non-whitespace character, and cannot start with a colon (:). ASCII control characters are
               * not supported as part of dimension names.
               */
              Name: string;
            }[];
            /** The namespace of the metric. */
            Namespace?: string;
          };
          /**
           * The statistic to use for comparison to the threshold. It can be any CloudWatch statistic or
           * extended statistic.
           */
          Stat: string;
          /**
           * If you omit Unit then all data that was collected with any unit is returned, along with the
           * corresponding units that were specified when the data was reported to CloudWatch. If you specify a
           * unit, the operation returns only data that was collected with that unit specified. If you specify a
           * unit that does not match the data collected, the results of the operation are null. CloudWatch does
           * not perform unit conversions.
           */
          Unit?: string;
        };
        /** A short name used to tie this object to the results in the response. */
        Id: string;
        /** This option indicates whether to return the timestamps and raw data values of this metric. */
        ReturnData?: boolean;
        /** The math expression to be performed on the returned data. */
        Expression?: string;
        /** The ID of the account where the metrics are located, if this is a cross-account alarm. */
        AccountId?: string;
      }[];
      DependencyConfig?: {
        DependencyKeyAttributes: unknown;
        /**
         * When the SLO monitors a specific operation of the dependency, this field specifies the name of that
         * operation in the dependency.
         * @minLength 1
         * @maxLength 255
         */
        DependencyOperationName: string;
      };
    };
    /** The value that the SLI metric is compared to. */
    MetricThreshold: number;
    /**
     * The arithmetic operation used when comparing the specified metric to the threshold.
     * @enum ["GreaterThanOrEqualTo","LessThanOrEqualTo","LessThan","GreaterThan"]
     */
    ComparisonOperator: "GreaterThanOrEqualTo" | "LessThanOrEqualTo" | "LessThan" | "GreaterThan";
  };
  RequestBasedSli?: {
    RequestBasedSliMetric: {
      KeyAttributes?: unknown;
      /**
       * If the SLO monitors a specific operation of the service, this field displays that operation name.
       * @minLength 1
       * @maxLength 255
       */
      OperationName?: string;
      /**
       * If the SLO monitors either the LATENCY or AVAILABILITY metric that Application Signals collects,
       * this field displays which of those metrics is used.
       * @enum ["LATENCY","AVAILABILITY"]
       */
      MetricType?: "LATENCY" | "AVAILABILITY";
      /**
       * This structure defines the metric that is used as the "total requests" number for a request-based
       * SLO. The number observed for this metric is divided by the number of "good requests" or "bad
       * requests" that is observed for the metric defined in `MonitoredRequestCountMetric`.
       */
      TotalRequestCountMetric?: {
        /**
         * A metric to be used directly for the SLO, or to be used in the math expression that will be used
         * for the SLO. Within one MetricDataQuery, you must specify either Expression or MetricStat but not
         * both.
         */
        MetricStat?: {
          /** The granularity, in seconds, to be used for the metric. */
          Period: number;
          Metric: {
            /** The name of the metric to use. */
            MetricName?: string;
            /**
             * An array of one or more dimensions to use to define the metric that you want to use.
             * @uniqueItems false
             */
            Dimensions?: {
              /**
               * The value of the dimension. Dimension values must contain only ASCII characters and must include at
               * least one non-whitespace character. ASCII control characters are not supported as part of dimension
               * values
               */
              Value: string;
              /**
               * The name of the dimension. Dimension names must contain only ASCII characters, must include at
               * least one non-whitespace character, and cannot start with a colon (:). ASCII control characters are
               * not supported as part of dimension names.
               */
              Name: string;
            }[];
            /** The namespace of the metric. */
            Namespace?: string;
          };
          /**
           * The statistic to use for comparison to the threshold. It can be any CloudWatch statistic or
           * extended statistic.
           */
          Stat: string;
          /**
           * If you omit Unit then all data that was collected with any unit is returned, along with the
           * corresponding units that were specified when the data was reported to CloudWatch. If you specify a
           * unit, the operation returns only data that was collected with that unit specified. If you specify a
           * unit that does not match the data collected, the results of the operation are null. CloudWatch does
           * not perform unit conversions.
           */
          Unit?: string;
        };
        /** A short name used to tie this object to the results in the response. */
        Id: string;
        /** This option indicates whether to return the timestamps and raw data values of this metric. */
        ReturnData?: boolean;
        /** The math expression to be performed on the returned data. */
        Expression?: string;
        /** The ID of the account where the metrics are located, if this is a cross-account alarm. */
        AccountId?: string;
      }[];
      MonitoredRequestCountMetric?: {
        /**
         * If you want to count "good requests" to determine the percentage of successful requests for this
         * request-based SLO, specify the metric to use as "good requests" in this structure.
         */
        GoodCountMetric?: {
          /**
           * A metric to be used directly for the SLO, or to be used in the math expression that will be used
           * for the SLO. Within one MetricDataQuery, you must specify either Expression or MetricStat but not
           * both.
           */
          MetricStat?: {
            /** The granularity, in seconds, to be used for the metric. */
            Period: number;
            Metric: {
              /** The name of the metric to use. */
              MetricName?: string;
              /**
               * An array of one or more dimensions to use to define the metric that you want to use.
               * @uniqueItems false
               */
              Dimensions?: {
                /**
                 * The value of the dimension. Dimension values must contain only ASCII characters and must include at
                 * least one non-whitespace character. ASCII control characters are not supported as part of dimension
                 * values
                 */
                Value: string;
                /**
                 * The name of the dimension. Dimension names must contain only ASCII characters, must include at
                 * least one non-whitespace character, and cannot start with a colon (:). ASCII control characters are
                 * not supported as part of dimension names.
                 */
                Name: string;
              }[];
              /** The namespace of the metric. */
              Namespace?: string;
            };
            /**
             * The statistic to use for comparison to the threshold. It can be any CloudWatch statistic or
             * extended statistic.
             */
            Stat: string;
            /**
             * If you omit Unit then all data that was collected with any unit is returned, along with the
             * corresponding units that were specified when the data was reported to CloudWatch. If you specify a
             * unit, the operation returns only data that was collected with that unit specified. If you specify a
             * unit that does not match the data collected, the results of the operation are null. CloudWatch does
             * not perform unit conversions.
             */
            Unit?: string;
          };
          /** A short name used to tie this object to the results in the response. */
          Id: string;
          /** This option indicates whether to return the timestamps and raw data values of this metric. */
          ReturnData?: boolean;
          /** The math expression to be performed on the returned data. */
          Expression?: string;
          /** The ID of the account where the metrics are located, if this is a cross-account alarm. */
          AccountId?: string;
        }[];
        /**
         * If you want to count "bad requests" to determine the percentage of successful requests for this
         * request-based SLO, specify the metric to use as "bad requests" in this structure.
         */
        BadCountMetric?: {
          /**
           * A metric to be used directly for the SLO, or to be used in the math expression that will be used
           * for the SLO. Within one MetricDataQuery, you must specify either Expression or MetricStat but not
           * both.
           */
          MetricStat?: {
            /** The granularity, in seconds, to be used for the metric. */
            Period: number;
            Metric: {
              /** The name of the metric to use. */
              MetricName?: string;
              /**
               * An array of one or more dimensions to use to define the metric that you want to use.
               * @uniqueItems false
               */
              Dimensions?: {
                /**
                 * The value of the dimension. Dimension values must contain only ASCII characters and must include at
                 * least one non-whitespace character. ASCII control characters are not supported as part of dimension
                 * values
                 */
                Value: string;
                /**
                 * The name of the dimension. Dimension names must contain only ASCII characters, must include at
                 * least one non-whitespace character, and cannot start with a colon (:). ASCII control characters are
                 * not supported as part of dimension names.
                 */
                Name: string;
              }[];
              /** The namespace of the metric. */
              Namespace?: string;
            };
            /**
             * The statistic to use for comparison to the threshold. It can be any CloudWatch statistic or
             * extended statistic.
             */
            Stat: string;
            /**
             * If you omit Unit then all data that was collected with any unit is returned, along with the
             * corresponding units that were specified when the data was reported to CloudWatch. If you specify a
             * unit, the operation returns only data that was collected with that unit specified. If you specify a
             * unit that does not match the data collected, the results of the operation are null. CloudWatch does
             * not perform unit conversions.
             */
            Unit?: string;
          };
          /** A short name used to tie this object to the results in the response. */
          Id: string;
          /** This option indicates whether to return the timestamps and raw data values of this metric. */
          ReturnData?: boolean;
          /** The math expression to be performed on the returned data. */
          Expression?: string;
          /** The ID of the account where the metrics are located, if this is a cross-account alarm. */
          AccountId?: string;
        }[];
      };
      DependencyConfig?: {
        DependencyKeyAttributes: unknown;
        /**
         * When the SLO monitors a specific operation of the dependency, this field specifies the name of that
         * operation in the dependency.
         * @minLength 1
         * @maxLength 255
         */
        DependencyOperationName: string;
      };
    };
    /** The value that the SLI metric is compared to. */
    MetricThreshold?: number;
    /**
     * The arithmetic operation used when comparing the specified metric to the threshold.
     * @enum ["GreaterThanOrEqualTo","LessThanOrEqualTo","LessThan","GreaterThan"]
     */
    ComparisonOperator?: "GreaterThanOrEqualTo" | "LessThanOrEqualTo" | "LessThan" | "GreaterThan";
  };
  /**
   * Displays whether this is a period-based SLO or a request-based SLO.
   * @enum ["PeriodBased","RequestBased"]
   */
  EvaluationType?: "PeriodBased" | "RequestBased";
  Goal?: {
    Interval?: {
      RollingInterval?: {
        DurationUnit: "MINUTE" | "HOUR" | "DAY" | "MONTH";
        Duration: number;
      };
      CalendarInterval?: {
        /**
         * Epoch time in seconds you want the first interval to start. Be sure to choose a time that
         * configures the intervals the way that you want. For example, if you want weekly intervals starting
         * on Mondays at 6 a.m., be sure to specify a start time that is a Monday at 6 a.m.
         * As soon as one calendar interval ends, another automatically begins.
         * @minimum 946684800
         */
        StartTime: number;
        DurationUnit: "MINUTE" | "HOUR" | "DAY" | "MONTH";
        Duration: number;
      };
    };
    /**
     * The threshold that determines if the goal is being met. An attainment goal is the ratio of good
     * periods that meet the threshold requirements to the total periods within the interval. For example,
     * an attainment goal of 99.9% means that within your interval, you are targeting 99.9% of the periods
     * to be in healthy state.
     * If you omit this parameter, 99 is used to represent 99% as the attainment goal.
     */
    AttainmentGoal?: number;
    /**
     * The percentage of remaining budget over total budget that you want to get warnings for. If you omit
     * this parameter, the default of 50.0 is used.
     */
    WarningThreshold?: number;
  };
  Tags?: {
    /**
     * A string that you can use to assign a value. The combination of tag keys and values can help you
     * organize and categorize your resources.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the specified tag key.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  BurnRateConfigurations?: {
    /**
     * The number of minutes to use as the look-back window.
     * @minimum 1
     * @maximum 10080
     */
    LookBackWindowMinutes: number;
  }[];
  ExclusionWindows?: ({
    Window: {
      DurationUnit: "MINUTE" | "HOUR" | "DAY" | "MONTH";
      Duration: number;
    };
    /**
     * The time you want the exclusion window to start at. Note that time exclusion windows can only be
     * scheduled in the future, not the past.
     */
    StartTime?: string;
    RecurrenceRule?: {
      /**
       * A cron or rate expression denoting how often to repeat this exclusion window.
       * @minLength 1
       * @maxLength 1024
       */
      Expression: string;
    };
    /**
     * An optional reason for scheduling this time exclusion window. Default is 'No reason'.
     * @default "No reason"
     * @minLength 1
     * @maxLength 1024
     */
    Reason?: string;
  })[];
};
