// This file is auto-generated. Do not edit manually.
// Source: aws-elasticloadbalancingv2-listenerrule.json

/**
 * Specifies a listener rule. The listener must be associated with an Application Load Balancer. Each
 * rule consists of a priority, one or more actions, and one or more conditions.
 * For more information, see [Quotas for your Application Load
 * Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-limits.html)
 * in the *User Guide for Application Load Balancers*.
 */
export type AwsElasticloadbalancingv2Listenerrule = {
  /** The Amazon Resource Name (ARN) of the listener. */
  ListenerArn?: string;
  RuleArn?: string;
  /**
   * The actions.
   * The rule must include exactly one of the following types of actions: ``forward``,
   * ``fixed-response``, or ``redirect``, and it must be the last action to be performed. If the rule is
   * for an HTTPS listener, it can also optionally include an authentication action.
   * @uniqueItems true
   */
  Actions: ({
    /**
     * The order for the action. This value is required for rules with multiple actions. The action with
     * the lowest value for order is performed first.
     */
    Order?: number;
    /**
     * The Amazon Resource Name (ARN) of the target group. Specify only when ``Type`` is ``forward`` and
     * you want to route to a single target group. To route to multiple target groups, you must use
     * ``ForwardConfig`` instead.
     */
    TargetGroupArn?: string;
    /**
     * [Application Load Balancer] Information for creating an action that returns a custom HTTP response.
     * Specify only when ``Type`` is ``fixed-response``.
     */
    FixedResponseConfig?: {
      /**
       * The content type.
       * Valid Values: text/plain | text/css | text/html | application/javascript | application/json
       */
      ContentType?: string;
      /** The HTTP response code (2XX, 4XX, or 5XX). */
      StatusCode: string;
      /** The message. */
      MessageBody?: string;
    };
    /**
     * [HTTPS listeners] Information for using Amazon Cognito to authenticate users. Specify only when
     * ``Type`` is ``authenticate-cognito``.
     */
    AuthenticateCognitoConfig?: {
      /**
       * The behavior if the user is not authenticated. The following are possible values:
       * +  deny```` - Return an HTTP 401 Unauthorized error.
       * +  allow```` - Allow the request to be forwarded to the target.
       * +  authenticate```` - Redirect the request to the IdP authorization endpoint. This is the default
       * value.
       */
      OnUnauthenticatedRequest?: string;
      /** The ID of the Amazon Cognito user pool client. */
      UserPoolClientId: string;
      /** The domain prefix or fully-qualified domain name of the Amazon Cognito user pool. */
      UserPoolDomain: string;
      /**
       * The maximum duration of the authentication session, in seconds. The default is 604800 seconds (7
       * days).
       */
      SessionTimeout?: number;
      /**
       * The set of user claims to be requested from the IdP. The default is ``openid``.
       * To verify which scope values your IdP supports and how to separate multiple values, see the
       * documentation for your IdP.
       */
      Scope?: string;
      /**
       * The name of the cookie used to maintain session information. The default is
       * AWSELBAuthSessionCookie.
       */
      SessionCookieName?: string;
      /** The Amazon Resource Name (ARN) of the Amazon Cognito user pool. */
      UserPoolArn: string;
      /** The query parameters (up to 10) to include in the redirect request to the authorization endpoint. */
      AuthenticationRequestExtraParams?: Record<string, string>;
    };
    /** The type of action. */
    Type: string;
    /**
     * [Application Load Balancer] Information for creating a redirect action. Specify only when ``Type``
     * is ``redirect``.
     */
    RedirectConfig?: {
      /**
       * The absolute path, starting with the leading "/". This component is not percent-encoded. The path
       * can contain #{host}, #{path}, and #{port}.
       */
      Path?: string;
      /**
       * The query parameters, URL-encoded when necessary, but not percent-encoded. Do not include the
       * leading "?", as it is automatically added. You can specify any of the reserved keywords.
       */
      Query?: string;
      /** The port. You can specify a value from 1 to 65535 or #{port}. */
      Port?: string;
      /** The hostname. This component is not percent-encoded. The hostname can contain #{host}. */
      Host?: string;
      /**
       * The protocol. You can specify HTTP, HTTPS, or #{protocol}. You can redirect HTTP to HTTP, HTTP to
       * HTTPS, and HTTPS to HTTPS. You can't redirect HTTPS to HTTP.
       */
      Protocol?: string;
      /** The HTTP redirect code. The redirect is either permanent (HTTP 301) or temporary (HTTP 302). */
      StatusCode: string;
    };
    /**
     * Information for creating an action that distributes requests among multiple target groups. Specify
     * only when ``Type`` is ``forward``.
     * If you specify both ``ForwardConfig`` and ``TargetGroupArn``, you can specify only one target
     * group using ``ForwardConfig`` and it must be the same target group specified in ``TargetGroupArn``.
     */
    ForwardConfig?: {
      /** Information about the target group stickiness for a rule. */
      TargetGroupStickinessConfig?: {
        /** Indicates whether target group stickiness is enabled. */
        Enabled?: boolean;
        /**
         * [Application Load Balancers] The time period, in seconds, during which requests from a client
         * should be routed to the same target group. The range is 1-604800 seconds (7 days). You must specify
         * this value when enabling target group stickiness.
         */
        DurationSeconds?: number;
      };
      /**
       * Information about how traffic will be distributed between multiple target groups in a forward rule.
       * @uniqueItems true
       */
      TargetGroups?: {
        /** The Amazon Resource Name (ARN) of the target group. */
        TargetGroupArn?: string;
        /** The weight. The range is 0 to 999. */
        Weight?: number;
      }[];
    };
    /**
     * [HTTPS listeners] Information about an identity provider that is compliant with OpenID Connect
     * (OIDC). Specify only when ``Type`` is ``authenticate-oidc``.
     */
    AuthenticateOidcConfig?: unknown | unknown;
    JwtValidationConfig?: {
      JwksEndpoint: string;
      Issuer: string;
      /** @uniqueItems true */
      AdditionalClaims?: {
        Format: string;
        Name: string;
        /** @uniqueItems true */
        Values: string[];
      }[];
    };
  })[];
  /**
   * The rule priority. A listener can't have multiple rules with the same priority.
   * If you try to reorder rules by updating their priorities, do not specify a new priority if an
   * existing rule already uses this priority, as this can cause an error. If you need to reuse a
   * priority with a different rule, you must remove it as a priority first, and then specify it in a
   * subsequent update.
   */
  Priority: number;
  /**
   * The conditions.
   * The rule can optionally include up to one of each of the following conditions:
   * ``http-request-method``, ``host-header``, ``path-pattern``, and ``source-ip``. A rule can also
   * optionally include one or more of each of the following conditions: ``http-header`` and
   * ``query-string``.
   * @uniqueItems true
   */
  Conditions: ({
    /**
     * The field in the HTTP request. The following are the possible values:
     * +   ``http-header``
     * +   ``http-request-method``
     * +   ``host-header``
     * +   ``path-pattern``
     * +   ``query-string``
     * +   ``source-ip``
     */
    Field?: string;
    /**
     * The regular expressions to match against the condition field. The maximum length of each string is
     * 128 characters. Specify only when ``Field`` is ``http-header``, ``host-header``, or
     * ``path-pattern``.
     */
    RegexValues?: string[];
    /**
     * The condition value. Specify only when ``Field`` is ``host-header`` or ``path-pattern``.
     * Alternatively, to specify multiple host names or multiple path patterns, use ``HostHeaderConfig``
     * or ``PathPatternConfig``.
     * If ``Field`` is ``host-header`` and you're not using ``HostHeaderConfig``, you can specify a
     * single host name (for example, my.example.com). A host name is case insensitive, can be up to 128
     * characters in length, and can contain any of the following characters.
     * +  A-Z, a-z, 0-9
     * +  - .
     * +  * (matches 0 or more characters)
     * +  ? (matches exactly 1 character)
     * If ``Field`` is ``path-pattern`` and you're not using ``PathPatternConfig``, you can specify a
     * single path pattern (for example, /img/*). A path pattern is case-sensitive, can be up to 128
     * characters in length, and can contain any of the following characters.
     * +  A-Z, a-z, 0-9
     * +  _ - . $ / ~ " ' @ : +
     * +  & (using &amp;)
     * +  * (matches 0 or more characters)
     * +  ? (matches exactly 1 character)
     */
    Values?: string[];
    /** Information for an HTTP method condition. Specify only when ``Field`` is ``http-request-method``. */
    HttpRequestMethodConfig?: {
      /**
       * The name of the request method. The maximum length is 40 characters. The allowed characters are
       * A-Z, hyphen (-), and underscore (_). The comparison is case sensitive. Wildcards are not supported;
       * therefore, the method name must be an exact match.
       * If you specify multiple strings, the condition is satisfied if one of the strings matches the HTTP
       * request method. We recommend that you route GET and HEAD requests in the same way, because the
       * response to a HEAD request may be cached.
       */
      Values?: string[];
    };
    /** Information for a path pattern condition. Specify only when ``Field`` is ``path-pattern``. */
    PathPatternConfig?: {
      RegexValues?: string[];
      /**
       * The path patterns to compare against the request URL. The maximum size of each string is 128
       * characters. The comparison is case sensitive. The following wildcard characters are supported: *
       * (matches 0 or more characters) and ? (matches exactly 1 character).
       * If you specify multiple strings, the condition is satisfied if one of them matches the request
       * URL. The path pattern is compared only to the path of the URL, not to its query string.
       */
      Values?: string[];
    };
    /** Information for an HTTP header condition. Specify only when ``Field`` is ``http-header``. */
    HttpHeaderConfig?: {
      RegexValues?: string[];
      /**
       * The strings to compare against the value of the HTTP header. The maximum length of each string is
       * 128 characters. The comparison strings are case insensitive. The following wildcard characters are
       * supported: * (matches 0 or more characters) and ? (matches exactly 1 character).
       * If the same header appears multiple times in the request, we search them in order until a match is
       * found.
       * If you specify multiple strings, the condition is satisfied if one of the strings matches the
       * value of the HTTP header. To require that all of the strings are a match, create one condition per
       * string.
       */
      Values?: string[];
      /**
       * The name of the HTTP header field. The maximum size is 40 characters. The header name is case
       * insensitive. The allowed characters are specified by RFC 7230. Wildcards are not supported.
       */
      HttpHeaderName?: string;
    };
    /** Information for a source IP condition. Specify only when ``Field`` is ``source-ip``. */
    SourceIpConfig?: {
      /**
       * The source IP addresses, in CIDR format. You can use both IPv4 and IPv6 addresses. Wildcards are
       * not supported.
       * If you specify multiple addresses, the condition is satisfied if the source IP address of the
       * request matches one of the CIDR blocks. This condition is not satisfied by the addresses in the
       * X-Forwarded-For header.
       * @uniqueItems true
       */
      Values?: string[];
    };
    /** Information for a host header condition. Specify only when ``Field`` is ``host-header``. */
    HostHeaderConfig?: {
      RegexValues?: string[];
      /**
       * The host names. The maximum length of each string is 128 characters. The comparison is case
       * insensitive. The following wildcard characters are supported: * (matches 0 or more characters) and
       * ? (matches exactly 1 character). You must include at least one "." character. You can include only
       * alphabetical characters after the final "." character.
       * If you specify multiple strings, the condition is satisfied if one of the strings matches the host
       * name.
       */
      Values?: string[];
    };
    /** Information for a query string condition. Specify only when ``Field`` is ``query-string``. */
    QueryStringConfig?: {
      /**
       * The key/value pairs or values to find in the query string. The maximum length of each string is 128
       * characters. The comparison is case insensitive. The following wildcard characters are supported: *
       * (matches 0 or more characters) and ? (matches exactly 1 character). To search for a literal '*' or
       * '?' character in a query string, you must escape these characters in ``Values`` using a '\'
       * character.
       * If you specify multiple key/value pairs or values, the condition is satisfied if one of them is
       * found in the query string.
       * @uniqueItems true
       */
      Values?: {
        /** The value. */
        Value?: string;
        /** The key. You can omit the key. */
        Key?: string;
      }[];
    };
  })[];
  /** @uniqueItems true */
  Transforms?: (unknown | unknown)[];
  IsDefault?: boolean;
};
