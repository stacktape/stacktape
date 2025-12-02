// This file is auto-generated. Do not edit manually.
// Source: aws-cloudfront-cachepolicy.json

/**
 * A cache policy.
 * When it's attached to a cache behavior, the cache policy determines the following:
 * +  The values that CloudFront includes in the cache key. These values can include HTTP headers,
 * cookies, and URL query strings. CloudFront uses the cache key to find an object in its cache that
 * it can return to the viewer.
 * +  The default, minimum, and maximum time to live (TTL) values that you want objects to stay in
 * the CloudFront cache.
 * The headers, cookies, and query strings that are included in the cache key are also included in
 * requests that CloudFront sends to the origin. CloudFront sends a request when it can't find a valid
 * object in its cache that matches the request's cache key. If you want to send values to the origin
 * but *not* include them in the cache key, use ``OriginRequestPolicy``.
 */
export type AwsCloudfrontCachepolicy = {
  /** The cache policy configuration. */
  CachePolicyConfig: {
    /** A comment to describe the cache policy. The comment cannot be longer than 128 characters. */
    Comment?: string;
    /**
     * The default amount of time, in seconds, that you want objects to stay in the CloudFront cache
     * before CloudFront sends another request to the origin to see if the object has been updated.
     * CloudFront uses this value as the object's time to live (TTL) only when the origin does *not* send
     * ``Cache-Control`` or ``Expires`` headers with the object. For more information, see [Managing How
     * Long Content Stays in an Edge Cache
     * (Expiration)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html)
     * in the *Amazon CloudFront Developer Guide*.
     * The default value for this field is 86400 seconds (one day). If the value of ``MinTTL`` is more
     * than 86400 seconds, then the default value for this field is the same as the value of ``MinTTL``.
     * @minimum 0
     */
    DefaultTTL: number;
    /**
     * The maximum amount of time, in seconds, that objects stay in the CloudFront cache before CloudFront
     * sends another request to the origin to see if the object has been updated. CloudFront uses this
     * value only when the origin sends ``Cache-Control`` or ``Expires`` headers with the object. For more
     * information, see [Managing How Long Content Stays in an Edge Cache
     * (Expiration)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html)
     * in the *Amazon CloudFront Developer Guide*.
     * The default value for this field is 31536000 seconds (one year). If the value of ``MinTTL`` or
     * ``DefaultTTL`` is more than 31536000 seconds, then the default value for this field is the same as
     * the value of ``DefaultTTL``.
     * @minimum 0
     */
    MaxTTL: number;
    /**
     * The minimum amount of time, in seconds, that you want objects to stay in the CloudFront cache
     * before CloudFront sends another request to the origin to see if the object has been updated. For
     * more information, see [Managing How Long Content Stays in an Edge Cache
     * (Expiration)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html)
     * in the *Amazon CloudFront Developer Guide*.
     * @minimum 0
     */
    MinTTL: number;
    /** A unique name to identify the cache policy. */
    Name: string;
    /**
     * The HTTP headers, cookies, and URL query strings to include in the cache key. The values included
     * in the cache key are also included in requests that CloudFront sends to the origin.
     */
    ParametersInCacheKeyAndForwardedToOrigin: {
      /**
       * An object that determines whether any cookies in viewer requests (and if so, which cookies) are
       * included in the cache key and in requests that CloudFront sends to the origin.
       */
      CookiesConfig: {
        /**
         * Determines whether any cookies in viewer requests are included in the cache key and in requests
         * that CloudFront sends to the origin. Valid values are:
         * +  ``none`` – No cookies in viewer requests are included in the cache key or in requests that
         * CloudFront sends to the origin. Even when this field is set to ``none``, any cookies that are
         * listed in an ``OriginRequestPolicy``*are* included in origin requests.
         * +  ``whitelist`` – Only the cookies in viewer requests that are listed in the ``CookieNames``
         * type are included in the cache key and in requests that CloudFront sends to the origin.
         * +  ``allExcept`` – All cookies in viewer requests are included in the cache key and in requests
         * that CloudFront sends to the origin, *except* for those that are listed in the ``CookieNames``
         * type, which are not included.
         * +  ``all`` – All cookies in viewer requests are included in the cache key and in requests that
         * CloudFront sends to the origin.
         * @pattern ^(none|whitelist|allExcept|all)$
         */
        CookieBehavior: string;
        /**
         * Contains a list of cookie names.
         * @uniqueItems false
         */
        Cookies?: string[];
      };
      /**
       * A flag that can affect whether the ``Accept-Encoding`` HTTP header is included in the cache key and
       * included in requests that CloudFront sends to the origin.
       * This field is related to the ``EnableAcceptEncodingGzip`` field. If one or both of these fields is
       * ``true``*and* the viewer request includes the ``Accept-Encoding`` header, then CloudFront does the
       * following:
       * +  Normalizes the value of the viewer's ``Accept-Encoding`` header
       * +  Includes the normalized header in the cache key
       * +  Includes the normalized header in the request to the origin, if a request is necessary
       * For more information, see [Compression
       * support](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-policy-compressed-objects)
       * in the *Amazon CloudFront Developer Guide*.
       * If you set this value to ``true``, and this cache behavior also has an origin request policy
       * attached, do not include the ``Accept-Encoding`` header in the origin request policy. CloudFront
       * always includes the ``Accept-Encoding`` header in origin requests when the value of this field is
       * ``true``, so including this header in an origin request policy has no effect.
       * If both of these fields are ``false``, then CloudFront treats the ``Accept-Encoding`` header the
       * same as any other HTTP header in the viewer request. By default, it's not included in the cache key
       * and it's not included in origin requests. In this case, you can manually add ``Accept-Encoding`` to
       * the headers whitelist like any other HTTP header.
       */
      EnableAcceptEncodingBrotli?: boolean;
      /**
       * A flag that can affect whether the ``Accept-Encoding`` HTTP header is included in the cache key and
       * included in requests that CloudFront sends to the origin.
       * This field is related to the ``EnableAcceptEncodingBrotli`` field. If one or both of these fields
       * is ``true``*and* the viewer request includes the ``Accept-Encoding`` header, then CloudFront does
       * the following:
       * +  Normalizes the value of the viewer's ``Accept-Encoding`` header
       * +  Includes the normalized header in the cache key
       * +  Includes the normalized header in the request to the origin, if a request is necessary
       * For more information, see [Compression
       * support](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-policy-compressed-objects)
       * in the *Amazon CloudFront Developer Guide*.
       * If you set this value to ``true``, and this cache behavior also has an origin request policy
       * attached, do not include the ``Accept-Encoding`` header in the origin request policy. CloudFront
       * always includes the ``Accept-Encoding`` header in origin requests when the value of this field is
       * ``true``, so including this header in an origin request policy has no effect.
       * If both of these fields are ``false``, then CloudFront treats the ``Accept-Encoding`` header the
       * same as any other HTTP header in the viewer request. By default, it's not included in the cache key
       * and it's not included in origin requests. In this case, you can manually add ``Accept-Encoding`` to
       * the headers whitelist like any other HTTP header.
       */
      EnableAcceptEncodingGzip: boolean;
      /**
       * An object that determines whether any HTTP headers (and if so, which headers) are included in the
       * cache key and in requests that CloudFront sends to the origin.
       */
      HeadersConfig: {
        /**
         * Determines whether any HTTP headers are included in the cache key and in requests that CloudFront
         * sends to the origin. Valid values are:
         * +  ``none`` – No HTTP headers are included in the cache key or in requests that CloudFront sends
         * to the origin. Even when this field is set to ``none``, any headers that are listed in an
         * ``OriginRequestPolicy``*are* included in origin requests.
         * +  ``whitelist`` – Only the HTTP headers that are listed in the ``Headers`` type are included in
         * the cache key and in requests that CloudFront sends to the origin.
         * @pattern ^(none|whitelist)$
         */
        HeaderBehavior: string;
        /**
         * Contains a list of HTTP header names.
         * @uniqueItems false
         */
        Headers?: string[];
      };
      /**
       * An object that determines whether any URL query strings in viewer requests (and if so, which query
       * strings) are included in the cache key and in requests that CloudFront sends to the origin.
       */
      QueryStringsConfig: {
        /**
         * Determines whether any URL query strings in viewer requests are included in the cache key and in
         * requests that CloudFront sends to the origin. Valid values are:
         * +  ``none`` – No query strings in viewer requests are included in the cache key or in requests
         * that CloudFront sends to the origin. Even when this field is set to ``none``, any query strings
         * that are listed in an ``OriginRequestPolicy``*are* included in origin requests.
         * +  ``whitelist`` – Only the query strings in viewer requests that are listed in the
         * ``QueryStringNames`` type are included in the cache key and in requests that CloudFront sends to
         * the origin.
         * +  ``allExcept`` – All query strings in viewer requests are included in the cache key and in
         * requests that CloudFront sends to the origin, *except* those that are listed in the
         * ``QueryStringNames`` type, which are not included.
         * +  ``all`` – All query strings in viewer requests are included in the cache key and in requests
         * that CloudFront sends to the origin.
         * @pattern ^(none|whitelist|allExcept|all)$
         */
        QueryStringBehavior: string;
        /**
         * Contains a list of query string names.
         * @uniqueItems false
         */
        QueryStrings?: string[];
      };
    };
  };
  Id?: string;
  LastModifiedTime?: string;
};
