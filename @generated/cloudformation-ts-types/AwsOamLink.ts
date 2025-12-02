// This file is auto-generated. Do not edit manually.
// Source: aws-oam-link.json

/** Definition of AWS::Oam::Link Resource Type */
export type AwsOamLink = {
  /** @maxLength 2048 */
  Arn?: string;
  Label?: string;
  /**
   * @minLength 1
   * @maxLength 64
   */
  LabelTemplate?: string;
  /**
   * @minItems 1
   * @maxItems 50
   * @uniqueItems true
   */
  ResourceTypes: ("AWS::CloudWatch::Metric" | "AWS::Logs::LogGroup" | "AWS::XRay::Trace" | "AWS::ApplicationInsights::Application" | "AWS::InternetMonitor::Monitor" | "AWS::ApplicationSignals::Service" | "AWS::ApplicationSignals::ServiceLevelObjective")[];
  /**
   * @minLength 1
   * @maxLength 2048
   */
  SinkIdentifier: string;
  LinkConfiguration?: {
    MetricConfiguration?: {
      /**
       * @minLength 1
       * @maxLength 2000
       */
      Filter: string;
    };
    LogGroupConfiguration?: {
      /**
       * @minLength 1
       * @maxLength 2000
       */
      Filter: string;
    };
  };
  /** Tags to apply to the link */
  Tags?: Record<string, string>;
};
