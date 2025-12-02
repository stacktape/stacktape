// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-networkperformancemetricsubscription.json

/** Resource Type definition for AWS::EC2::NetworkPerformanceMetricSubscription */
export type AwsEc2Networkperformancemetricsubscription = {
  /** The starting Region or Availability Zone for metric to subscribe to. */
  Source: string;
  /** The target Region or Availability Zone for the metric to subscribe to. */
  Destination: string;
  /** The metric type to subscribe to. */
  Metric: string;
  /** The statistic to subscribe to. */
  Statistic: string;
};
