// This file is auto-generated. Do not edit manually.
// Source: aws-cloudfront-originrequestpolicy.json

/**
 * An origin request policy.
 * When it's attached to a cache behavior, the origin request policy determines the values that
 * CloudFront includes in requests that it sends to the origin. Each request that CloudFront sends to
 * the origin includes the following:
 * +  The request body and the URL path (without the domain name) from the viewer request.
 * +  The headers that CloudFront automatically includes in every origin request, including
 * ``Host``, ``User-Agent``, and ``X-Amz-Cf-Id``.
 * +  All HTTP headers, cookies, and URL query strings that are specified in the cache policy or the
 * origin request policy. These can include items from the viewer request and, in the case of headers,
 * additional ones that are added by CloudFront.
 * CloudFront sends a request when it can't find an object in its cache that matches the request. If
 * you want to send values to the origin and also include them in the cache key, use ``CachePolicy``.
 */
export type AwsCloudfrontOriginrequestpolicy = {
  Id?: string;
  LastModifiedTime?: string;
  /** The origin request policy configuration. */
  OriginRequestPolicyConfig: {
    /** A comment to describe the origin request policy. The comment cannot be longer than 128 characters. */
    Comment?: string;
    /** The cookies from viewer requests to include in origin requests. */
    CookiesConfig: {
      /**
       * Determines whether cookies in viewer requests are included in requests that CloudFront sends to the
       * origin. Valid values are:
       * +  ``none`` – No cookies in viewer requests are included in requests that CloudFront sends to the
       * origin. Even when this field is set to ``none``, any cookies that are listed in a
       * ``CachePolicy``*are* included in origin requests.
       * +  ``whitelist`` – Only the cookies in viewer requests that are listed in the ``CookieNames``
       * type are included in requests that CloudFront sends to the origin.
       * +  ``all`` – All cookies in viewer requests are included in requests that CloudFront sends to the
       * origin.
       * +  ``allExcept`` – All cookies in viewer requests are included in requests that CloudFront sends
       * to the origin, *except* for those listed in the ``CookieNames`` type, which are not included.
       * @pattern ^(none|whitelist|all|allExcept)$
       */
      CookieBehavior: string;
      /**
       * Contains a list of cookie names.
       * @uniqueItems false
       */
      Cookies?: string[];
    };
    /**
     * The HTTP headers to include in origin requests. These can include headers from viewer requests and
     * additional headers added by CloudFront.
     */
    HeadersConfig: {
      /**
       * Determines whether any HTTP headers are included in requests that CloudFront sends to the origin.
       * Valid values are:
       * +  ``none`` – No HTTP headers in viewer requests are included in requests that CloudFront sends
       * to the origin. Even when this field is set to ``none``, any headers that are listed in a
       * ``CachePolicy``*are* included in origin requests.
       * +  ``whitelist`` – Only the HTTP headers that are listed in the ``Headers`` type are included in
       * requests that CloudFront sends to the origin.
       * +  ``allViewer`` – All HTTP headers in viewer requests are included in requests that CloudFront
       * sends to the origin.
       * +  ``allViewerAndWhitelistCloudFront`` – All HTTP headers in viewer requests and the additional
       * CloudFront headers that are listed in the ``Headers`` type are included in requests that CloudFront
       * sends to the origin. The additional headers are added by CloudFront.
       * +  ``allExcept`` – All HTTP headers in viewer requests are included in requests that CloudFront
       * sends to the origin, *except* for those listed in the ``Headers`` type, which are not included.
       * @pattern ^(none|whitelist|allViewer|allViewerAndWhitelistCloudFront|allExcept)$
       */
      HeaderBehavior: string;
      /**
       * Contains a list of HTTP header names.
       * @uniqueItems false
       */
      Headers?: string[];
    };
    /** A unique name to identify the origin request policy. */
    Name: string;
    /** The URL query strings from viewer requests to include in origin requests. */
    QueryStringsConfig: {
      /**
       * Determines whether any URL query strings in viewer requests are included in requests that
       * CloudFront sends to the origin. Valid values are:
       * +  ``none`` – No query strings in viewer requests are included in requests that CloudFront sends
       * to the origin. Even when this field is set to ``none``, any query strings that are listed in a
       * ``CachePolicy``*are* included in origin requests.
       * +  ``whitelist`` – Only the query strings in viewer requests that are listed in the
       * ``QueryStringNames`` type are included in requests that CloudFront sends to the origin.
       * +  ``all`` – All query strings in viewer requests are included in requests that CloudFront sends
       * to the origin.
       * +  ``allExcept`` – All query strings in viewer requests are included in requests that CloudFront
       * sends to the origin, *except* for those listed in the ``QueryStringNames`` type, which are not
       * included.
       * @pattern ^(none|whitelist|all|allExcept)$
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
