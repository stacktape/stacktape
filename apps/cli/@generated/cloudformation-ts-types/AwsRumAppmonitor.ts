// This file is auto-generated. Do not edit manually.
// Source: aws-rum-appmonitor.json

/** Resource Type definition for AWS::RUM::AppMonitor */
export type AwsRumAppmonitor = {
  /**
   * The unique ID of the new app monitor.
   * @minLength 36
   * @maxLength 36
   * @pattern ^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$
   */
  Id?: string;
  /**
   * A name for the app monitor
   * @minLength 1
   * @maxLength 255
   * @pattern [\.\-_/#A-Za-z0-9]+
   */
  Name: string;
  /**
   * The top-level internet domain name for which your application has administrative authority. The
   * CreateAppMonitor requires either the domain or the domain list.
   * @minLength 1
   * @maxLength 253
   * @pattern ^(localhost)|^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?![-.])([A-Za-z0-9-\.\-]{0,63})((?![-])([a-zA-Z0-9]{1}|^[a-zA-Z0-9]{0,1}))\.(?![-])[A-Za-z-0-9]{1,63}((?![-])([a-zA-Z0-9]{1}|^[a-zA-Z0-9]{0,1}))|^(\*\.)(?![-.])([A-Za-z0-9-\.\-]{0,63})((?![-])([a-zA-Z0-9]{1}|^[a-zA-Z0-9]{0,1}))\.(?![-])[A-Za-z-0-9]{1,63}((?![-])([a-zA-Z0-9]{1}|^[a-zA-Z0-9]{0,1}))
   */
  Domain?: string;
  /**
   * The top-level internet domain names for which your application has administrative authority. The
   * CreateAppMonitor requires either the domain or the domain list.
   * @minItems 1
   * @maxItems 5
   */
  DomainList?: string[];
  /**
   * Data collected by RUM is kept by RUM for 30 days and then deleted. This parameter specifies whether
   * RUM sends a copy of this telemetry data to CWLlong in your account. This enables you to keep the
   * telemetry data for more than 30 days, but it does incur CWLlong charges. If you omit this
   * parameter, the default is false
   */
  CwLogEnabled?: boolean;
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
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  AppMonitorConfiguration?: {
    /**
     * The ID of the identity pool that is used to authorize the sending of data to RUM.
     * @minLength 1
     * @maxLength 55
     * @pattern [\w-]+:[0-9a-f-]+
     */
    IdentityPoolId?: string;
    /**
     * A list of URLs in your website or application to exclude from RUM data collection. You can't
     * include both ExcludedPages and IncludedPages in the same operation.
     */
    ExcludedPages?: string[];
    /**
     * If this app monitor is to collect data from only certain pages in your application, this structure
     * lists those pages. You can't include both ExcludedPages and IncludedPages in the same operation.
     */
    IncludedPages?: string[];
    /** A list of pages in the RUM console that are to be displayed with a favorite icon. */
    FavoritePages?: string[];
    /**
     * Specifies the percentage of user sessions to use for RUM data collection. Choosing a higher
     * percentage gives you more data but also incurs more costs. The number you specify is the percentage
     * of user sessions that will be used. If you omit this parameter, the default of 10 is used.
     * @minimum 0
     * @maximum 1
     */
    SessionSampleRate?: number;
    /**
     * The ARN of the guest IAM role that is attached to the identity pool that is used to authorize the
     * sending of data to RUM.
     */
    GuestRoleArn?: string;
    /**
     * If you set this to true, the RUM web client sets two cookies, a session cookie and a user cookie.
     * The cookies allow the RUM web client to collect data relating to the number of users an application
     * has and the behavior of the application across a sequence of events. Cookies are stored in the
     * top-level domain of the current page.
     */
    AllowCookies?: boolean;
    /** An array that lists the types of telemetry data that this app monitor is to collect. */
    Telemetries?: ("errors" | "performance" | "http")[];
    /**
     * If you set this to true, RUM enables xray tracing for the user sessions that RUM samples. RUM adds
     * an xray trace header to allowed HTTP requests. It also records an xray segment for allowed HTTP
     * requests. You can see traces and segments from these user sessions in the xray console and the CW
     * ServiceLens console.
     */
    EnableXRay?: boolean;
    /**
     * An array of structures which define the destinations and the metrics that you want to send.
     * @minItems 0
     * @maxItems 20
     * @uniqueItems true
     */
    MetricDestinations?: ({
      /**
       * Defines the destination to send the metrics to. Valid values are CloudWatch and Evidently. If you
       * specify Evidently, you must also specify the ARN of the Evidently experiment that is to be the
       * destination and an IAM role that has permission to write to the experiment.
       * @enum ["CloudWatch","Evidently"]
       */
      Destination: "CloudWatch" | "Evidently";
      /**
       * Use this parameter only if Destination is Evidently. This parameter specifies the ARN of the
       * Evidently experiment that will receive the extended metrics.
       * @pattern arn:[^:]*:[^:]*:[^:]*:[^:]*:.*
       */
      DestinationArn?: string;
      /**
       * This parameter is required if Destination is Evidently. If Destination is CloudWatch, do not use
       * this parameter.
       * This parameter specifies the ARN of an IAM role that RUM will assume to write to the Evidently
       * experiment that you are sending metrics to. This role must have permission to write to that
       * experiment.
       * @pattern arn:[^:]*:[^:]*:[^:]*:[^:]*:.*
       */
      IamRoleArn?: string;
      /**
       * An array of structures which define the metrics that you want to send.
       * @minItems 0
       * @maxItems 2000
       * @uniqueItems true
       */
      MetricDefinitions?: {
        /**
         * The name for the metric that is defined in this structure. For extended metrics, valid values are
         * the following:
         * PerformanceNavigationDuration
         * PerformanceResourceDuration
         * NavigationSatisfiedTransaction
         * NavigationToleratedTransaction
         * NavigationFrustratedTransaction
         * WebVitalsCumulativeLayoutShift
         * WebVitalsFirstInputDelay
         * WebVitalsLargestContentfulPaint
         * WebVitalsInteractionToNextPaint
         * JsErrorCount
         * HttpErrorCount
         * SessionCount
         * PageViewCount
         * Http4xxCount
         * Http5xxCount
         * SessionDuration
         * PageViewCountPerSession
         * JsErrorCountPerSession
         * Http4xxCountPerSession
         * Http5xxCountPerSession
         * JsErrorCountPerPageView
         * Http4xxCountPerPageView
         * Http5xxCountPerPageView
         * TimeOnPage
         * ColdLaunchTime
         * WarmLaunchTime
         * CrashCount
         * ANRCount
         * AppHangCount
         * ScreenLoadCount
         * ScreenLoadTime
         * NetworkLatency
         * SpanPayloadSize
         * LogEventPayloadSize
         * @minLength 1
         * @maxLength 255
         */
        Name: string;
        /**
         * The namespace used by CloudWatch Metrics for the metric that is defined in this structure
         * @minLength 1
         * @maxLength 237
         * @pattern [a-zA-Z0-9-._/#:]+$
         */
        Namespace?: string;
        /**
         * The field within the event object that the metric value is sourced from.
         * If you omit this field, a hardcoded value of 1 is pushed as the metric value. This is useful if you
         * just want to count the number of events that the filter catches.
         * If this metric is sent to Evidently, this field will be passed to Evidently raw and Evidently will
         * handle data extraction from the event.
         * @minLength 1
         * @maxLength 256
         * @pattern .*
         */
        ValueKey?: string;
        /**
         * The CloudWatch metric unit to use for this metric. If you omit this field, the metric is recorded
         * with no unit.
         * @minLength 1
         * @maxLength 256
         */
        UnitLabel?: string;
        /**
         * Use this field only if you are sending the metric to CloudWatch.
         * This field is a map of field paths to dimension names. It defines the dimensions to associate with
         * this metric in CloudWatch. For extended metrics, valid values for the entries in this field are the
         * following:
         * "metadata.pageId": "PageId"
         * "metadata.browserName": "BrowserName"
         * "metadata.deviceType": "DeviceType"
         * "metadata.osName": "OSName"
         * "metadata.countryCode": "CountryCode"
         * "event_details.fileType": "FileType"
         * All dimensions listed in this field must also be included in EventPattern.
         */
        DimensionKeys?: Record<string, string>;
        /**
         * The pattern that defines the metric, specified as a JSON object. RUM checks events that happen in a
         * user's session against the pattern, and events that match the pattern are sent to the metric
         * destination.
         * When you define extended metrics, the metric definition is not valid if EventPattern is omitted.
         * Example event patterns:
         * '{ "event_type": ["com.amazon.rum.js_error_event"], "metadata": { "browserName": [ "Chrome",
         * "Safari" ], } }'
         * '{ "event_type": ["com.amazon.rum.performance_navigation_event"], "metadata": { "browserName": [
         * "Chrome", "Firefox" ] }, "event_details": { "duration": [{ "numeric": [ "<", 2000 ] }] } }'
         * '{ "event_type": ["com.amazon.rum.performance_navigation_event"], "metadata": { "browserName": [
         * "Chrome", "Safari" ], "countryCode": [ "US" ] }, "event_details": { "duration": [{ "numeric": [
         * ">=", 2000, "<", 8000 ] }] } }'
         * If the metrics destination' is CloudWatch and the event also matches a value in DimensionKeys, then
         * the metric is published with the specified dimensions.
         * @minLength 1
         * @maxLength 4000
         */
        EventPattern?: string;
      }[];
    })[];
  };
  CustomEvents?: {
    /** Indicates whether AppMonitor accepts custom events. */
    Status?: "ENABLED" | "DISABLED";
  };
  ResourcePolicy?: {
    /** The JSON to use as the resource policy. The document can be up to 4 KB in size. */
    PolicyDocument: string;
    /**
     * A string value that you can use to conditionally update your policy. You can provide the revision
     * ID of your existing policy to make mutating requests against that policy.
     * When you assign a policy revision ID, then later requests about that policy will be rejected with
     * an InvalidPolicyRevisionIdException error if they don't provide the correct current revision ID.
     * @minLength 1
     * @maxLength 255
     */
    PolicyRevisionId?: string;
  };
  DeobfuscationConfiguration?: {
    /**
     * A structure that contains the configuration for how an app monitor can unminify JavaScript error
     * stack traces using source maps.
     */
    JavaScriptSourceMaps?: {
      /**
       * Specifies whether JavaScript error stack traces should be unminified for this app monitor. The
       * default is for JavaScript error stack trace unminification to be DISABLED
       * @enum ["ENABLED","DISABLED"]
       */
      Status: "ENABLED" | "DISABLED";
      /**
       * The S3Uri of the bucket or folder that stores the source map files. It is required if status is
       * ENABLED.
       * @pattern ^s3://[a-z0-9][-.a-z0-9]{1,62}(?:/[-!_*'().a-z0-9A-Z]+(?:/[-!_*'().a-z0-9A-Z]+)*)?/?$
       */
      S3Uri?: string;
    };
  };
  /** @enum ["Web","Android","iOS"] */
  Platform?: "Web" | "Android" | "iOS";
};
