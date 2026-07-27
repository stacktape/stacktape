// This file is auto-generated. Do not edit manually.
// Source: aws-qldb-stream.json

/** Resource schema for AWS::QLDB::Stream. */
export type AwsQldbStream = {
  LedgerName: string;
  StreamName: string;
  RoleArn: string;
  InclusiveStartTime: string;
  ExclusiveEndTime?: string;
  KinesisConfiguration: {
    StreamArn?: string;
    AggregationEnabled?: boolean;
  };
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 127
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 255
     */
    Value: string;
  }[];
  Arn?: string;
  Id?: string;
};
