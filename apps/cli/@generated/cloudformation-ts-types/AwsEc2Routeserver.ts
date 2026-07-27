// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-routeserver.json

/** VPC Route Server */
export type AwsEc2Routeserver = {
  /**
   * The Amazon-side ASN of the Route Server.
   * @minimum 1
   * @maximum 4294967294
   */
  AmazonSideAsn: number;
  /** The Amazon Resource Name (ARN) of the Route Server. */
  Arn?: string;
  /** The ID of the Route Server. */
  Id?: string;
  /**
   * Whether to enable persistent routes
   * @enum ["enable","disable"]
   */
  PersistRoutes?: "enable" | "disable";
  /**
   * The duration of persistent routes in minutes
   * @minimum 0
   * @maximum 5
   */
  PersistRoutesDuration?: number;
  /** Whether to enable SNS notifications */
  SnsNotificationsEnabled?: boolean;
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
