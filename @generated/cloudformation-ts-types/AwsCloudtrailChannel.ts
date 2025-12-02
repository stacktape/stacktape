// This file is auto-generated. Do not edit manually.
// Source: aws-cloudtrail-channel.json

/**
 * A channel receives events from a specific source (such as an on-premises storage solution or
 * application, or a partner event data source), and delivers the events to one or more event data
 * stores. You use channels to ingest events into CloudTrail from sources outside AWS.
 */
export type AwsCloudtrailChannel = {
  Name?: string;
  /**
   * The ARN of an on-premises storage solution or application, or a partner event source.
   * @minLength 1
   * @maxLength 256
   * @pattern (.*)
   */
  Source?: string;
  /**
   * One or more resources to which events arriving through a channel are logged and stored.
   * @maxItems 10
   * @uniqueItems true
   */
  Destinations?: {
    /**
     * The type of destination for events arriving from a channel.
     * @enum ["EVENT_DATA_STORE"]
     */
    Type: "EVENT_DATA_STORE";
    /**
     * The ARN of a resource that receives events from a channel.
     * @minLength 3
     * @maxLength 1024
     * @pattern (^[a-zA-Z0-9._/\-:]+$)
     */
    Location: string;
  }[];
  ChannelArn?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems false
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
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
};
