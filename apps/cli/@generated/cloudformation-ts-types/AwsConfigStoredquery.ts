// This file is auto-generated. Do not edit manually.
// Source: aws-config-storedquery.json

/** Resource Type definition for AWS::Config::StoredQuery */
export type AwsConfigStoredquery = {
  /**
   * @minLength 1
   * @maxLength 500
   */
  QueryArn?: string;
  /**
   * @minLength 1
   * @maxLength 36
   * @pattern ^\S+$
   */
  QueryId?: string;
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9-_]+$
   */
  QueryName: string;
  /**
   * @minLength 0
   * @maxLength 256
   * @pattern [\s\S]*
   */
  QueryDescription?: string;
  /**
   * @minLength 1
   * @maxLength 4096
   * @pattern [\s\S]*
   */
  QueryExpression: string;
  /**
   * The tags for the stored query.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
