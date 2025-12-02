// This file is auto-generated. Do not edit manually.
// Source: aws-mediapackage-channel.json

/** Resource schema for AWS::MediaPackage::Channel */
export type AwsMediapackageChannel = {
  /** The Amazon Resource Name (ARN) assigned to the Channel. */
  Arn?: string;
  /**
   * The ID of the Channel.
   * @minLength 1
   * @maxLength 256
   * @pattern \A[0-9a-zA-Z-_]+\Z
   */
  Id: string;
  /** A short text description of the Channel. */
  Description?: string;
  /** An HTTP Live Streaming (HLS) ingest resource configuration. */
  HlsIngest?: {
    /** A list of endpoints to which the source stream should be sent. */
    ingestEndpoints?: {
      /** The system generated unique identifier for the IngestEndpoint */
      Id: string;
      /** The system generated username for ingest authentication. */
      Username: string;
      /** The system generated password for ingest authentication. */
      Password: string;
      /** The ingest URL to which the source stream should be sent. */
      Url: string;
    }[];
  };
  /**
   * A collection of tags associated with a resource
   * @uniqueItems true
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  /** The configuration parameters for egress access logging. */
  EgressAccessLogs?: {
    /**
     * Sets a custom AWS CloudWatch log group name for access logs. If a log group name isn't specified,
     * the defaults are used: /aws/MediaPackage/EgressAccessLogs for egress access logs and
     * /aws/MediaPackage/IngressAccessLogs for ingress access logs.
     * @minLength 1
     * @maxLength 256
     * @pattern \A^(\/aws\/MediaPackage\/)[a-zA-Z0-9_-]+\Z
     */
    LogGroupName?: string;
  };
  /** The configuration parameters for egress access logging. */
  IngressAccessLogs?: {
    /**
     * Sets a custom AWS CloudWatch log group name for access logs. If a log group name isn't specified,
     * the defaults are used: /aws/MediaPackage/EgressAccessLogs for egress access logs and
     * /aws/MediaPackage/IngressAccessLogs for ingress access logs.
     * @minLength 1
     * @maxLength 256
     * @pattern \A^(\/aws\/MediaPackage\/)[a-zA-Z0-9_-]+\Z
     */
    LogGroupName?: string;
  };
};
