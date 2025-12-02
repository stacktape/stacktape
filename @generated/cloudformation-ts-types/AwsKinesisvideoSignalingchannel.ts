// This file is auto-generated. Do not edit manually.
// Source: aws-kinesisvideo-signalingchannel.json

/** Resource Type Definition for AWS::KinesisVideo::SignalingChannel */
export type AwsKinesisvideoSignalingchannel = {
  /** The Amazon Resource Name (ARN) of the Kinesis Video Signaling Channel. */
  Arn?: string;
  /**
   * The name of the Kinesis Video Signaling Channel.
   * @minLength 1
   * @maxLength 256
   * @pattern [a-zA-Z0-9_.-]+
   */
  Name?: string;
  /**
   * The type of the Kinesis Video Signaling Channel to create. Currently, SINGLE_MASTER is the only
   * supported channel type.
   * @enum ["SINGLE_MASTER"]
   */
  Type?: "SINGLE_MASTER";
  /**
   * The period of time a signaling channel retains undelivered messages before they are discarded.
   * @minimum 5
   * @maximum 120
   */
  MessageTtlSeconds?: number;
  /**
   * An array of key-value pairs to apply to this resource.
   * @minItems 1
   * @maxItems 50
   * @uniqueItems false
   */
  Tags?: {
    /**
     * The key name of the tag. Specify a value that is 1 to 128 Unicode characters in length and cannot
     * be prefixed with aws:. The following characters can be used: the set of Unicode letters, digits,
     * whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. Specify a value that is 0 to 256 Unicode characters in length and cannot be
     * prefixed with aws:.  The following characters can be used: the set of Unicode letters, digits,
     * whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
