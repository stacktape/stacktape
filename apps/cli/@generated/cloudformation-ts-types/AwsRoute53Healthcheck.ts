// This file is auto-generated. Do not edit manually.
// Source: aws-route53-healthcheck.json

/** Resource schema for AWS::Route53::HealthCheck. */
export type AwsRoute53Healthcheck = {
  HealthCheckId?: string;
  /** A complex type that contains information about the health check. */
  HealthCheckConfig: {
    AlarmIdentifier?: {
      /**
       * The name of the CloudWatch alarm that you want Amazon Route 53 health checkers to use to determine
       * whether this health check is healthy.
       * @minLength 1
       * @maxLength 256
       */
      Name: string;
      /**
       * For the CloudWatch alarm that you want Route 53 health checkers to use to determine whether this
       * health check is healthy, the region that the alarm was created in.
       */
      Region: string;
    };
    /** @maxItems 256 */
    ChildHealthChecks?: string[];
    EnableSNI?: boolean;
    /**
     * @minimum 1
     * @maximum 10
     */
    FailureThreshold?: number;
    /** @maxLength 255 */
    FullyQualifiedDomainName?: string;
    /**
     * @minimum 0
     * @maximum 256
     */
    HealthThreshold?: number;
    /** @enum ["Healthy","LastKnownStatus","Unhealthy"] */
    InsufficientDataHealthStatus?: "Healthy" | "LastKnownStatus" | "Unhealthy";
    Inverted?: boolean;
    /**
     * @maxLength 45
     * @pattern ^((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))$|^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$
     */
    IPAddress?: string;
    MeasureLatency?: boolean;
    /**
     * @minimum 1
     * @maximum 65535
     */
    Port?: number;
    /** @maxItems 64 */
    Regions?: string[];
    /**
     * @minimum 10
     * @maximum 30
     */
    RequestInterval?: number;
    /** @maxLength 255 */
    ResourcePath?: string;
    /** @maxLength 255 */
    SearchString?: string;
    /**
     * @minLength 1
     * @maxLength 255
     */
    RoutingControlArn?: string;
    /** @enum ["CALCULATED","CLOUDWATCH_METRIC","HTTP","HTTP_STR_MATCH","HTTPS","HTTPS_STR_MATCH","TCP","RECOVERY_CONTROL"] */
    Type: "CALCULATED" | "CLOUDWATCH_METRIC" | "HTTP" | "HTTP_STR_MATCH" | "HTTPS" | "HTTPS_STR_MATCH" | "TCP" | "RECOVERY_CONTROL";
  };
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  HealthCheckTags?: {
    /**
     * The key name of the tag.
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag.
     * @maxLength 256
     */
    Value: string;
  }[];
};
