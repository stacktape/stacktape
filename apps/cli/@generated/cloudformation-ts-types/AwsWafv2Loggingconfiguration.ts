// This file is auto-generated. Do not edit manually.
// Source: aws-wafv2-loggingconfiguration.json

/** A WAFv2 Logging Configuration Resource Provider */
export type AwsWafv2Loggingconfiguration = {
  /**
   * The Amazon Resource Name (ARN) of the web ACL that you want to associate with
   * LogDestinationConfigs.
   */
  ResourceArn: string;
  /**
   * The Amazon Resource Names (ARNs) of the logging destinations that you want to associate with the
   * web ACL.
   */
  LogDestinationConfigs: string[];
  /**
   * The parts of the request that you want to keep out of the logs. For example, if you redact the
   * HEADER field, the HEADER field in the firehose will be xxx.
   */
  RedactedFields?: {
    /**
     * Inspect the HTTP method. The method indicates the type of operation that the request is asking the
     * origin to perform.
     */
    Method?: Record<string, unknown>;
    /** Inspect the query string. This is the part of a URL that appears after a ? character, if any. */
    QueryString?: Record<string, unknown>;
    /**
     * Inspect a single header. Provide the name of the header to inspect, for example, User-Agent or
     * Referer. This setting isn't case sensitive.
     */
    SingleHeader?: {
      /** The name of the query header to inspect. */
      Name: string;
    };
    /**
     * Inspect the request URI path. This is the part of a web request that identifies a resource, for
     * example, /images/daily-ad.jpg.
     */
    UriPath?: Record<string, unknown>;
  }[];
  /**
   * Indicates whether the logging configuration was created by AWS Firewall Manager, as part of an AWS
   * WAF policy configuration. If true, only Firewall Manager can modify or delete the configuration.
   */
  ManagedByFirewallManager?: boolean;
  /**
   * Filtering that specifies which web requests are kept in the logs and which are dropped. You can
   * filter on the rule action and on the web request labels that were applied by matching rules during
   * web ACL evaluation.
   */
  LoggingFilter?: {
    /**
     * Default handling for logs that don't match any of the specified filtering conditions.
     * @enum ["KEEP","DROP"]
     */
    DefaultBehavior: "KEEP" | "DROP";
    /**
     * The filters that you want to apply to the logs.
     * @minItems 1
     */
    Filters: ({
      /**
       * How to handle logs that satisfy the filter's conditions and requirement.
       * @enum ["KEEP","DROP"]
       */
      Behavior: "KEEP" | "DROP";
      /**
       * Match conditions for the filter.
       * @minItems 1
       */
      Conditions: ({
        /** A single action condition. */
        ActionCondition?: {
          /**
           * Logic to apply to the filtering conditions. You can specify that, in order to satisfy the filter, a
           * log must match all conditions or must match at least one condition.
           * @enum ["ALLOW","BLOCK","COUNT","CAPTCHA","CHALLENGE","EXCLUDED_AS_COUNT"]
           */
          Action: "ALLOW" | "BLOCK" | "COUNT" | "CAPTCHA" | "CHALLENGE" | "EXCLUDED_AS_COUNT";
        };
        /** A single label name condition. */
        LabelNameCondition?: {
          /**
           * The label name that a log record must contain in order to meet the condition. This must be a fully
           * qualified label name. Fully qualified labels have a prefix, optional namespaces, and label name.
           * The prefix identifies the rule group or web ACL context of the rule that added the label.
           */
          LabelName: string;
        };
      })[];
      /**
       * Logic to apply to the filtering conditions. You can specify that, in order to satisfy the filter, a
       * log must match all conditions or must match at least one condition.
       * @enum ["MEETS_ALL","MEETS_ANY"]
       */
      Requirement: "MEETS_ALL" | "MEETS_ANY";
    })[];
  };
};
