// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-routeserverendpoint.json

/** VPC Route Server Endpoint */
export type AwsEc2Routeserverendpoint = {
  /** Route Server ID */
  RouteServerId: string;
  /** The Amazon Resource Name (ARN) of the Route Server Endpoint. */
  Arn?: string;
  /** The ID of the Route Server Endpoint. */
  Id?: string;
  /** Subnet ID */
  SubnetId: string;
  /** VPC ID */
  VpcId?: string;
  /** Elastic Network Interface ID owned by the Route Server Endpoint */
  EniId?: string;
  /** Elastic Network Interface IP address owned by the Route Server Endpoint */
  EniAddress?: string;
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
