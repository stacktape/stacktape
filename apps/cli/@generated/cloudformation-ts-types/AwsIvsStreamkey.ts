// This file is auto-generated. Do not edit manually.
// Source: aws-ivs-streamkey.json

/** Resource Type definition for AWS::IVS::StreamKey */
export type AwsIvsStreamkey = {
  /**
   * Stream Key ARN is automatically generated on creation and assigned as the unique identifier.
   * @minLength 1
   * @maxLength 128
   * @pattern ^arn:aws:ivs:[a-z0-9-]+:[0-9]+:stream-key/[a-zA-Z0-9-]+$
   */
  Arn?: string;
  /**
   * Channel ARN for the stream.
   * @pattern ^arn:aws:ivs:[a-z0-9-]+:[0-9]+:channel/[a-zA-Z0-9-]+$
   */
  ChannelArn: string;
  /**
   * A list of key-value pairs that contain metadata for the asset model.
   * @maxItems 50
   * @uniqueItems true
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
  /** Stream-key value. */
  Value?: string;
};
