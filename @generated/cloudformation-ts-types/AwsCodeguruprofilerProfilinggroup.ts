// This file is auto-generated. Do not edit manually.
// Source: aws-codeguruprofiler-profilinggroup.json

/**
 * This resource schema represents the Profiling Group resource in the Amazon CodeGuru Profiler
 * service.
 */
export type AwsCodeguruprofilerProfilinggroup = {
  /**
   * The name of the profiling group.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[\w-]+$
   */
  ProfilingGroupName: string;
  /**
   * The compute platform of the profiling group.
   * @enum ["Default","AWSLambda"]
   */
  ComputePlatform?: "Default" | "AWSLambda";
  /** The agent permissions attached to this profiling group. */
  AgentPermissions?: {
    /** The principals for the agent permissions. */
    Principals: string[];
  };
  /**
   * Configuration for Notification Channels for Anomaly Detection feature in CodeGuru Profiler which
   * enables customers to detect anomalies in the application profile for those methods that represent
   * the highest proportion of CPU time or latency
   */
  AnomalyDetectionNotificationConfiguration?: {
    channelId?: string;
    channelUri: string;
  }[];
  /** The Amazon Resource Name (ARN) of the specified profiling group. */
  Arn?: string;
  /**
   * The tags associated with a profiling group.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. The allowed characters across services are: letters, numbers, and
     * spaces representable in UTF-8, and the following characters: + - = . _ : / @.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length. The
     * allowed characters across services are: letters, numbers, and spaces representable in UTF-8, and
     * the following characters: + - = . _ : / @.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
