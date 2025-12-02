// This file is auto-generated. Do not edit manually.
// Source: aws-cloudfront-monitoringsubscription.json

/**
 * A monitoring subscription. This structure contains information about whether additional CloudWatch
 * metrics are enabled for a given CloudFront distribution.
 */
export type AwsCloudfrontMonitoringsubscription = {
  /** The ID of the distribution that you are enabling metrics for. */
  DistributionId: string;
  /** A subscription configuration for additional CloudWatch metrics. */
  MonitoringSubscription: {
    /** A subscription configuration for additional CloudWatch metrics. */
    RealtimeMetricsSubscriptionConfig?: {
      /**
       * A flag that indicates whether additional CloudWatch metrics are enabled for a given CloudFront
       * distribution.
       * @enum ["Enabled","Disabled"]
       */
      RealtimeMetricsSubscriptionStatus: "Enabled" | "Disabled";
    };
  };
};
