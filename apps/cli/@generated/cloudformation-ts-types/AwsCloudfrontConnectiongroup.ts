// This file is auto-generated. Do not edit manually.
// Source: aws-cloudfront-connectiongroup.json

/**
 * The connection group for your distribution tenants. When you first create a distribution tenant and
 * you don't specify a connection group, CloudFront will automatically create a default connection
 * group for you. When you create a new distribution tenant and don't specify a connection group, the
 * default one will be associated with your distribution tenant.
 */
export type AwsCloudfrontConnectiongroup = {
  Id?: string;
  /** The name of the connection group. */
  Name: string;
  Arn?: string;
  CreatedTime?: string;
  LastModifiedTime?: string;
  /**
   * A complex type that contains zero or more ``Tag`` elements.
   * @uniqueItems false
   */
  Tags?: {
    /**
     * A string that contains ``Tag`` key.
     * The string length should be between 1 and 128 characters. Valid characters include ``a-z``,
     * ``A-Z``, ``0-9``, space, and the special characters ``_ - . : / = + @``.
     */
    Key: string;
    /**
     * A string that contains an optional ``Tag`` value.
     * The string length should be between 0 and 256 characters. Valid characters include ``a-z``,
     * ``A-Z``, ``0-9``, space, and the special characters ``_ - . : / = + @``.
     */
    Value: string;
  }[];
  /** IPv6 is enabled for the connection group. */
  Ipv6Enabled?: boolean;
  RoutingEndpoint?: string;
  /** The ID of the Anycast static IP list. */
  AnycastIpListId?: string;
  Status?: string;
  /** Whether the connection group is enabled. */
  Enabled?: boolean;
  IsDefault?: boolean;
  ETag?: string;
};
