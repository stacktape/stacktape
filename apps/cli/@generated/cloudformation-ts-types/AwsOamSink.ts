// This file is auto-generated. Do not edit manually.
// Source: aws-oam-sink.json

/** Resource Type definition for AWS::Oam::Sink */
export type AwsOamSink = {
  /**
   * The Amazon resource name (ARN) of the ObservabilityAccessManager Sink
   * @maxLength 2048
   */
  Arn?: string;
  /**
   * The name of the ObservabilityAccessManager Sink.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9_.-]+$
   */
  Name: string;
  /** The policy of this ObservabilityAccessManager Sink. */
  Policy?: Record<string, unknown>;
  /** Tags to apply to the sink */
  Tags?: Record<string, string>;
};
