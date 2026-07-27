// This file is auto-generated. Do not edit manually.
// Source: aws-lightsail-distribution.json

/** Resource Type definition for AWS::Lightsail::Distribution */
export type AwsLightsailDistribution = {
  /**
   * The name for the distribution.
   * @pattern \w[\w\-]*\w
   */
  DistributionName: string;
  DistributionArn?: string;
  /** The bundle ID to use for the distribution. */
  BundleId: string;
  /** The IP address type for the distribution. */
  IpAddressType?: string;
  /**
   * An array of objects that describe the per-path cache behavior for the distribution.
   * @uniqueItems true
   */
  CacheBehaviors?: {
    /** The cache behavior for the specified path. */
    Behavior?: string;
    /**
     * The path to a directory or file to cached, or not cache. Use an asterisk symbol to specify wildcard
     * directories (path/to/assets/*), and file types (*.html, *jpg, *js). Directories and file paths are
     * case-sensitive.
     */
    Path?: string;
  }[];
  /** An object that describes the cache behavior settings for the distribution. */
  CacheBehaviorSettings?: {
    /** The HTTP methods that are processed and forwarded to the distribution's origin. */
    AllowedHTTPMethods?: string;
    /** The HTTP method responses that are cached by your distribution. */
    CachedHTTPMethods?: string;
    /**
     * The default amount of time that objects stay in the distribution's cache before the distribution
     * forwards another request to the origin to determine whether the content has been updated.
     */
    DefaultTTL?: number;
    /**
     * The maximum amount of time that objects stay in the distribution's cache before the distribution
     * forwards another request to the origin to determine whether the object has been updated.
     */
    MaximumTTL?: number;
    /**
     * The minimum amount of time that objects stay in the distribution's cache before the distribution
     * forwards another request to the origin to determine whether the object has been updated.
     */
    MinimumTTL?: number;
    /**
     * An object that describes the cookies that are forwarded to the origin. Your content is cached based
     * on the cookies that are forwarded.
     */
    ForwardedCookies?: {
      /**
       * The specific cookies to forward to your distribution's origin.
       * @uniqueItems true
       */
      CookiesAllowList?: string[];
      /**
       * Specifies which cookies to forward to the distribution's origin for a cache behavior: all, none, or
       * allow-list to forward only the cookies specified in the cookiesAllowList parameter.
       */
      Option?: string;
    };
    /**
     * An object that describes the headers that are forwarded to the origin. Your content is cached based
     * on the headers that are forwarded.
     */
    ForwardedHeaders?: {
      /**
       * The specific headers to forward to your distribution's origin.
       * @uniqueItems true
       */
      HeadersAllowList?: string[];
      /** The headers that you want your distribution to forward to your origin and base caching on. */
      Option?: string;
    };
    /**
     * An object that describes the query strings that are forwarded to the origin. Your content is cached
     * based on the query strings that are forwarded.
     */
    ForwardedQueryStrings?: {
      /**
       * The specific query strings that the distribution forwards to the origin.
       * @uniqueItems true
       */
      QueryStringsAllowList?: string[];
      /** Indicates whether the distribution forwards and caches based on query strings. */
      Option?: boolean;
    };
  };
  /** An object that describes the default cache behavior for the distribution. */
  DefaultCacheBehavior: {
    /** The cache behavior of the distribution. */
    Behavior?: string;
  };
  /**
   * An object that describes the origin resource for the distribution, such as a Lightsail instance or
   * load balancer.
   */
  Origin: {
    /** The name of the origin resource. */
    Name?: string;
    /**
     * The protocol that your Amazon Lightsail distribution uses when establishing a connection with your
     * origin to pull content.
     */
    ProtocolPolicy?: string;
    /** The AWS Region name of the origin resource. */
    RegionName?: string;
  };
  /** The status of the distribution. */
  Status?: string;
  /**
   * Indicates whether the bundle that is currently applied to your distribution, specified using the
   * distributionName parameter, can be changed to another bundle.
   */
  AbleToUpdateBundle?: boolean;
  /** Indicates whether the distribution is enabled. */
  IsEnabled?: boolean;
  /** The certificate attached to the Distribution. */
  CertificateName?: string;
  /**
   * An array of key-value pairs to apply to this resource.
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
    Value?: string;
  }[];
};
