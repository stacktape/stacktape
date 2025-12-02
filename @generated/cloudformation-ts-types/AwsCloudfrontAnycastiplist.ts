// This file is auto-generated. Do not edit manually.
// Source: aws-cloudfront-anycastiplist.json

/**
 * An Anycast static IP list. For more information, see [Request Anycast static IPs to use for
 * allowlisting](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/request-static-ips.html)
 * in the *Amazon CloudFront Developer Guide*.
 */
export type AwsCloudfrontAnycastiplist = {
  AnycastIpList?: {
    /** The static IP addresses that are allocated to the Anycast static IP list. */
    AnycastIps: string[];
    /** The Amazon Resource Name (ARN) of the Anycast static IP list. */
    Arn: string;
    /** The ID of the Anycast static IP list. */
    Id: string;
    /** The number of IP addresses in the Anycast static IP list. */
    IpCount: number;
    IpAddressType?: "ipv4" | "dualstack";
    /** The last time the Anycast static IP list was modified. */
    LastModifiedTime: string;
    /**
     * The name of the Anycast static IP list.
     * @minLength 1
     * @maxLength 64
     * @pattern ^[a-zA-Z0-9-_]{1,64}$
     */
    Name: string;
    /** The status of the Anycast static IP list. Valid values: ``Deployed``, ``Deploying``, or ``Failed``. */
    Status: string;
  };
  ETag?: string;
  Id?: string;
  /** The number of IP addresses in the Anycast static IP list. */
  IpCount: number;
  IpAddressType?: "ipv4" | "dualstack";
  /**
   * The name of the Anycast static IP list.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9-_]{1,64}$
   */
  Name: string;
  /** A complex type that contains zero or more ``Tag`` elements. */
  Tags?: {
    /** A complex type that contains ``Tag`` elements. */
    Items?: {
      /**
       * A string that contains ``Tag`` key.
       * The string length should be between 1 and 128 characters. Valid characters include ``a-z``,
       * ``A-Z``, ``0-9``, space, and the special characters ``_ - . : / = + @``.
       * @minLength 1
       * @maxLength 128
       * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
       */
      Key: string;
      /**
       * A string that contains an optional ``Tag`` value.
       * The string length should be between 0 and 256 characters. Valid characters include ``a-z``,
       * ``A-Z``, ``0-9``, space, and the special characters ``_ - . : / = + @``.
       * @minLength 0
       * @maxLength 256
       * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
       */
      Value?: string;
    }[];
  };
};
