// This file is auto-generated. Do not edit manually.
// Source: aws-wafv2-rulegroup.json

/**
 * Contains the Rules that identify the requests that you want to allow, block, or count. In a
 * RuleGroup, you also specify a default action (ALLOW or BLOCK), and the action for each Rule that
 * you add to a RuleGroup, for example, block requests from specified IP addresses or block requests
 * from specified referrers. You also associate the RuleGroup with a CloudFront distribution to
 * identify the requests that you want AWS WAF to filter. If you add more than one Rule to a
 * RuleGroup, a request needs to match only one of the specifications to be allowed, blocked, or
 * counted.
 */
export type AwsWafv2Rulegroup = {
  Arn?: string;
  /** @minimum 0 */
  Capacity: number;
  Description?: string;
  Name?: string;
  Id?: string;
  Scope: "CLOUDFRONT" | "REGIONAL";
  /** Collection of Rules. */
  Rules?: ({
    Name: string;
    Priority: number;
    Statement: {
      ByteMatchStatement?: {
        SearchString?: string;
        SearchStringBase64?: string;
        FieldToMatch: {
          SingleHeader?: {
            Name: string;
          };
          /**
           * One query argument in a web request, identified by name, for example UserName or SalesRegion. The
           * name can be up to 30 characters long and isn't case sensitive.
           */
          SingleQueryArgument?: {
            Name: string;
          };
          /** All query arguments of a web request. */
          AllQueryArguments?: Record<string, unknown>;
          /**
           * The path component of the URI of a web request. This is the part of a web request that identifies a
           * resource, for example, /images/daily-ad.jpg.
           */
          UriPath?: Record<string, unknown>;
          /**
           * The query string of a web request. This is the part of a URL that appears after a ? character, if
           * any.
           */
          QueryString?: Record<string, unknown>;
          Body?: {
            OversizeHandling?: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          /**
           * The HTTP method of a web request. The method indicates the type of operation that the request is
           * asking the origin to perform.
           */
          Method?: Record<string, unknown>;
          JsonBody?: {
            MatchPattern: {
              /** Inspect all parts of the web request's JSON body. */
              All?: Record<string, unknown>;
              IncludedPaths?: string[];
            };
            MatchScope: "ALL" | "KEY" | "VALUE";
            InvalidFallbackBehavior?: "MATCH" | "NO_MATCH" | "EVALUATE_AS_STRING";
            OversizeHandling?: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          Headers?: {
            MatchPattern: {
              /** Inspect all parts of the web request headers. */
              All?: Record<string, unknown>;
              /**
               * @minItems 1
               * @maxItems 199
               */
              IncludedHeaders?: string[];
              /**
               * @minItems 1
               * @maxItems 199
               */
              ExcludedHeaders?: string[];
            };
            MatchScope: "ALL" | "KEY" | "VALUE";
            OversizeHandling: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          Cookies?: {
            MatchPattern: {
              /** Inspect all parts of the web request cookies. */
              All?: Record<string, unknown>;
              /**
               * @minItems 1
               * @maxItems 199
               */
              IncludedCookies?: string[];
              /**
               * @minItems 1
               * @maxItems 199
               */
              ExcludedCookies?: string[];
            };
            MatchScope: "ALL" | "KEY" | "VALUE";
            OversizeHandling: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          JA3Fingerprint?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior: "MATCH" | "NO_MATCH";
          };
          JA4Fingerprint?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior: "MATCH" | "NO_MATCH";
          };
          UriFragment?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior?: "MATCH" | "NO_MATCH";
          };
        };
        TextTransformations: ({
          Priority: number;
          Type: "NONE" | "COMPRESS_WHITE_SPACE" | "HTML_ENTITY_DECODE" | "LOWERCASE" | "CMD_LINE" | "URL_DECODE" | "BASE64_DECODE" | "HEX_DECODE" | "MD5" | "REPLACE_COMMENTS" | "ESCAPE_SEQ_DECODE" | "SQL_HEX_DECODE" | "CSS_DECODE" | "JS_DECODE" | "NORMALIZE_PATH" | "NORMALIZE_PATH_WIN" | "REMOVE_NULLS" | "REPLACE_NULLS" | "BASE64_DECODE_EXT" | "URL_DECODE_UNI" | "UTF8_TO_UNICODE";
        })[];
        PositionalConstraint: "EXACTLY" | "STARTS_WITH" | "ENDS_WITH" | "CONTAINS" | "CONTAINS_WORD";
      };
      SqliMatchStatement?: {
        FieldToMatch: {
          SingleHeader?: {
            Name: string;
          };
          /**
           * One query argument in a web request, identified by name, for example UserName or SalesRegion. The
           * name can be up to 30 characters long and isn't case sensitive.
           */
          SingleQueryArgument?: {
            Name: string;
          };
          /** All query arguments of a web request. */
          AllQueryArguments?: Record<string, unknown>;
          /**
           * The path component of the URI of a web request. This is the part of a web request that identifies a
           * resource, for example, /images/daily-ad.jpg.
           */
          UriPath?: Record<string, unknown>;
          /**
           * The query string of a web request. This is the part of a URL that appears after a ? character, if
           * any.
           */
          QueryString?: Record<string, unknown>;
          Body?: {
            OversizeHandling?: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          /**
           * The HTTP method of a web request. The method indicates the type of operation that the request is
           * asking the origin to perform.
           */
          Method?: Record<string, unknown>;
          JsonBody?: {
            MatchPattern: {
              /** Inspect all parts of the web request's JSON body. */
              All?: Record<string, unknown>;
              IncludedPaths?: string[];
            };
            MatchScope: "ALL" | "KEY" | "VALUE";
            InvalidFallbackBehavior?: "MATCH" | "NO_MATCH" | "EVALUATE_AS_STRING";
            OversizeHandling?: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          Headers?: {
            MatchPattern: {
              /** Inspect all parts of the web request headers. */
              All?: Record<string, unknown>;
              /**
               * @minItems 1
               * @maxItems 199
               */
              IncludedHeaders?: string[];
              /**
               * @minItems 1
               * @maxItems 199
               */
              ExcludedHeaders?: string[];
            };
            MatchScope: "ALL" | "KEY" | "VALUE";
            OversizeHandling: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          Cookies?: {
            MatchPattern: {
              /** Inspect all parts of the web request cookies. */
              All?: Record<string, unknown>;
              /**
               * @minItems 1
               * @maxItems 199
               */
              IncludedCookies?: string[];
              /**
               * @minItems 1
               * @maxItems 199
               */
              ExcludedCookies?: string[];
            };
            MatchScope: "ALL" | "KEY" | "VALUE";
            OversizeHandling: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          JA3Fingerprint?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior: "MATCH" | "NO_MATCH";
          };
          JA4Fingerprint?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior: "MATCH" | "NO_MATCH";
          };
          UriFragment?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior?: "MATCH" | "NO_MATCH";
          };
        };
        TextTransformations: ({
          Priority: number;
          Type: "NONE" | "COMPRESS_WHITE_SPACE" | "HTML_ENTITY_DECODE" | "LOWERCASE" | "CMD_LINE" | "URL_DECODE" | "BASE64_DECODE" | "HEX_DECODE" | "MD5" | "REPLACE_COMMENTS" | "ESCAPE_SEQ_DECODE" | "SQL_HEX_DECODE" | "CSS_DECODE" | "JS_DECODE" | "NORMALIZE_PATH" | "NORMALIZE_PATH_WIN" | "REMOVE_NULLS" | "REPLACE_NULLS" | "BASE64_DECODE_EXT" | "URL_DECODE_UNI" | "UTF8_TO_UNICODE";
        })[];
        SensitivityLevel?: "LOW" | "HIGH";
      };
      XssMatchStatement?: {
        FieldToMatch: {
          SingleHeader?: {
            Name: string;
          };
          /**
           * One query argument in a web request, identified by name, for example UserName or SalesRegion. The
           * name can be up to 30 characters long and isn't case sensitive.
           */
          SingleQueryArgument?: {
            Name: string;
          };
          /** All query arguments of a web request. */
          AllQueryArguments?: Record<string, unknown>;
          /**
           * The path component of the URI of a web request. This is the part of a web request that identifies a
           * resource, for example, /images/daily-ad.jpg.
           */
          UriPath?: Record<string, unknown>;
          /**
           * The query string of a web request. This is the part of a URL that appears after a ? character, if
           * any.
           */
          QueryString?: Record<string, unknown>;
          Body?: {
            OversizeHandling?: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          /**
           * The HTTP method of a web request. The method indicates the type of operation that the request is
           * asking the origin to perform.
           */
          Method?: Record<string, unknown>;
          JsonBody?: {
            MatchPattern: {
              /** Inspect all parts of the web request's JSON body. */
              All?: Record<string, unknown>;
              IncludedPaths?: string[];
            };
            MatchScope: "ALL" | "KEY" | "VALUE";
            InvalidFallbackBehavior?: "MATCH" | "NO_MATCH" | "EVALUATE_AS_STRING";
            OversizeHandling?: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          Headers?: {
            MatchPattern: {
              /** Inspect all parts of the web request headers. */
              All?: Record<string, unknown>;
              /**
               * @minItems 1
               * @maxItems 199
               */
              IncludedHeaders?: string[];
              /**
               * @minItems 1
               * @maxItems 199
               */
              ExcludedHeaders?: string[];
            };
            MatchScope: "ALL" | "KEY" | "VALUE";
            OversizeHandling: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          Cookies?: {
            MatchPattern: {
              /** Inspect all parts of the web request cookies. */
              All?: Record<string, unknown>;
              /**
               * @minItems 1
               * @maxItems 199
               */
              IncludedCookies?: string[];
              /**
               * @minItems 1
               * @maxItems 199
               */
              ExcludedCookies?: string[];
            };
            MatchScope: "ALL" | "KEY" | "VALUE";
            OversizeHandling: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          JA3Fingerprint?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior: "MATCH" | "NO_MATCH";
          };
          JA4Fingerprint?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior: "MATCH" | "NO_MATCH";
          };
          UriFragment?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior?: "MATCH" | "NO_MATCH";
          };
        };
        TextTransformations: ({
          Priority: number;
          Type: "NONE" | "COMPRESS_WHITE_SPACE" | "HTML_ENTITY_DECODE" | "LOWERCASE" | "CMD_LINE" | "URL_DECODE" | "BASE64_DECODE" | "HEX_DECODE" | "MD5" | "REPLACE_COMMENTS" | "ESCAPE_SEQ_DECODE" | "SQL_HEX_DECODE" | "CSS_DECODE" | "JS_DECODE" | "NORMALIZE_PATH" | "NORMALIZE_PATH_WIN" | "REMOVE_NULLS" | "REPLACE_NULLS" | "BASE64_DECODE_EXT" | "URL_DECODE_UNI" | "UTF8_TO_UNICODE";
        })[];
      };
      SizeConstraintStatement?: {
        FieldToMatch: {
          SingleHeader?: {
            Name: string;
          };
          /**
           * One query argument in a web request, identified by name, for example UserName or SalesRegion. The
           * name can be up to 30 characters long and isn't case sensitive.
           */
          SingleQueryArgument?: {
            Name: string;
          };
          /** All query arguments of a web request. */
          AllQueryArguments?: Record<string, unknown>;
          /**
           * The path component of the URI of a web request. This is the part of a web request that identifies a
           * resource, for example, /images/daily-ad.jpg.
           */
          UriPath?: Record<string, unknown>;
          /**
           * The query string of a web request. This is the part of a URL that appears after a ? character, if
           * any.
           */
          QueryString?: Record<string, unknown>;
          Body?: {
            OversizeHandling?: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          /**
           * The HTTP method of a web request. The method indicates the type of operation that the request is
           * asking the origin to perform.
           */
          Method?: Record<string, unknown>;
          JsonBody?: {
            MatchPattern: {
              /** Inspect all parts of the web request's JSON body. */
              All?: Record<string, unknown>;
              IncludedPaths?: string[];
            };
            MatchScope: "ALL" | "KEY" | "VALUE";
            InvalidFallbackBehavior?: "MATCH" | "NO_MATCH" | "EVALUATE_AS_STRING";
            OversizeHandling?: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          Headers?: {
            MatchPattern: {
              /** Inspect all parts of the web request headers. */
              All?: Record<string, unknown>;
              /**
               * @minItems 1
               * @maxItems 199
               */
              IncludedHeaders?: string[];
              /**
               * @minItems 1
               * @maxItems 199
               */
              ExcludedHeaders?: string[];
            };
            MatchScope: "ALL" | "KEY" | "VALUE";
            OversizeHandling: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          Cookies?: {
            MatchPattern: {
              /** Inspect all parts of the web request cookies. */
              All?: Record<string, unknown>;
              /**
               * @minItems 1
               * @maxItems 199
               */
              IncludedCookies?: string[];
              /**
               * @minItems 1
               * @maxItems 199
               */
              ExcludedCookies?: string[];
            };
            MatchScope: "ALL" | "KEY" | "VALUE";
            OversizeHandling: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          JA3Fingerprint?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior: "MATCH" | "NO_MATCH";
          };
          JA4Fingerprint?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior: "MATCH" | "NO_MATCH";
          };
          UriFragment?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior?: "MATCH" | "NO_MATCH";
          };
        };
        /** @enum ["EQ","NE","LE","LT","GE","GT"] */
        ComparisonOperator: "EQ" | "NE" | "LE" | "LT" | "GE" | "GT";
        /**
         * @minimum 0
         * @maximum 21474836480
         */
        Size: number;
        TextTransformations: ({
          Priority: number;
          Type: "NONE" | "COMPRESS_WHITE_SPACE" | "HTML_ENTITY_DECODE" | "LOWERCASE" | "CMD_LINE" | "URL_DECODE" | "BASE64_DECODE" | "HEX_DECODE" | "MD5" | "REPLACE_COMMENTS" | "ESCAPE_SEQ_DECODE" | "SQL_HEX_DECODE" | "CSS_DECODE" | "JS_DECODE" | "NORMALIZE_PATH" | "NORMALIZE_PATH_WIN" | "REMOVE_NULLS" | "REPLACE_NULLS" | "BASE64_DECODE_EXT" | "URL_DECODE_UNI" | "UTF8_TO_UNICODE";
        })[];
      };
      GeoMatchStatement?: {
        CountryCodes?: string[];
        ForwardedIPConfig?: {
          /** @pattern ^[a-zA-Z0-9-]+{1,255}$ */
          HeaderName: string;
          /** @enum ["MATCH","NO_MATCH"] */
          FallbackBehavior: "MATCH" | "NO_MATCH";
        };
      };
      IPSetReferenceStatement?: {
        Arn: string;
        IPSetForwardedIPConfig?: {
          /** @pattern ^[a-zA-Z0-9-]+{1,255}$ */
          HeaderName: string;
          /** @enum ["MATCH","NO_MATCH"] */
          FallbackBehavior: "MATCH" | "NO_MATCH";
          /** @enum ["FIRST","LAST","ANY"] */
          Position: "FIRST" | "LAST" | "ANY";
        };
      };
      RegexPatternSetReferenceStatement?: {
        Arn: string;
        FieldToMatch: {
          SingleHeader?: {
            Name: string;
          };
          /**
           * One query argument in a web request, identified by name, for example UserName or SalesRegion. The
           * name can be up to 30 characters long and isn't case sensitive.
           */
          SingleQueryArgument?: {
            Name: string;
          };
          /** All query arguments of a web request. */
          AllQueryArguments?: Record<string, unknown>;
          /**
           * The path component of the URI of a web request. This is the part of a web request that identifies a
           * resource, for example, /images/daily-ad.jpg.
           */
          UriPath?: Record<string, unknown>;
          /**
           * The query string of a web request. This is the part of a URL that appears after a ? character, if
           * any.
           */
          QueryString?: Record<string, unknown>;
          Body?: {
            OversizeHandling?: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          /**
           * The HTTP method of a web request. The method indicates the type of operation that the request is
           * asking the origin to perform.
           */
          Method?: Record<string, unknown>;
          JsonBody?: {
            MatchPattern: {
              /** Inspect all parts of the web request's JSON body. */
              All?: Record<string, unknown>;
              IncludedPaths?: string[];
            };
            MatchScope: "ALL" | "KEY" | "VALUE";
            InvalidFallbackBehavior?: "MATCH" | "NO_MATCH" | "EVALUATE_AS_STRING";
            OversizeHandling?: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          Headers?: {
            MatchPattern: {
              /** Inspect all parts of the web request headers. */
              All?: Record<string, unknown>;
              /**
               * @minItems 1
               * @maxItems 199
               */
              IncludedHeaders?: string[];
              /**
               * @minItems 1
               * @maxItems 199
               */
              ExcludedHeaders?: string[];
            };
            MatchScope: "ALL" | "KEY" | "VALUE";
            OversizeHandling: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          Cookies?: {
            MatchPattern: {
              /** Inspect all parts of the web request cookies. */
              All?: Record<string, unknown>;
              /**
               * @minItems 1
               * @maxItems 199
               */
              IncludedCookies?: string[];
              /**
               * @minItems 1
               * @maxItems 199
               */
              ExcludedCookies?: string[];
            };
            MatchScope: "ALL" | "KEY" | "VALUE";
            OversizeHandling: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          JA3Fingerprint?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior: "MATCH" | "NO_MATCH";
          };
          JA4Fingerprint?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior: "MATCH" | "NO_MATCH";
          };
          UriFragment?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior?: "MATCH" | "NO_MATCH";
          };
        };
        TextTransformations: ({
          Priority: number;
          Type: "NONE" | "COMPRESS_WHITE_SPACE" | "HTML_ENTITY_DECODE" | "LOWERCASE" | "CMD_LINE" | "URL_DECODE" | "BASE64_DECODE" | "HEX_DECODE" | "MD5" | "REPLACE_COMMENTS" | "ESCAPE_SEQ_DECODE" | "SQL_HEX_DECODE" | "CSS_DECODE" | "JS_DECODE" | "NORMALIZE_PATH" | "NORMALIZE_PATH_WIN" | "REMOVE_NULLS" | "REPLACE_NULLS" | "BASE64_DECODE_EXT" | "URL_DECODE_UNI" | "UTF8_TO_UNICODE";
        })[];
      };
      RateBasedStatement?: {
        Limit: number;
        EvaluationWindowSec?: 60 | 120 | 300 | 600;
        /** @enum ["IP","FORWARDED_IP","CONSTANT","CUSTOM_KEYS"] */
        AggregateKeyType: "IP" | "FORWARDED_IP" | "CONSTANT" | "CUSTOM_KEYS";
        /**
         * Specifies the aggregate keys to use in a rate-base rule.
         * @maxItems 5
         */
        CustomKeys?: ({
          Cookie?: {
            /**
             * The name of the cookie to use.
             * @minLength 1
             * @maxLength 64
             * @pattern .*\S.*
             */
            Name: string;
            TextTransformations: ({
              Priority: number;
              Type: "NONE" | "COMPRESS_WHITE_SPACE" | "HTML_ENTITY_DECODE" | "LOWERCASE" | "CMD_LINE" | "URL_DECODE" | "BASE64_DECODE" | "HEX_DECODE" | "MD5" | "REPLACE_COMMENTS" | "ESCAPE_SEQ_DECODE" | "SQL_HEX_DECODE" | "CSS_DECODE" | "JS_DECODE" | "NORMALIZE_PATH" | "NORMALIZE_PATH_WIN" | "REMOVE_NULLS" | "REPLACE_NULLS" | "BASE64_DECODE_EXT" | "URL_DECODE_UNI" | "UTF8_TO_UNICODE";
            })[];
          };
          ForwardedIP?: Record<string, unknown>;
          Header?: {
            /**
             * The name of the header to use.
             * @minLength 1
             * @maxLength 64
             * @pattern .*\S.*
             */
            Name: string;
            TextTransformations: ({
              Priority: number;
              Type: "NONE" | "COMPRESS_WHITE_SPACE" | "HTML_ENTITY_DECODE" | "LOWERCASE" | "CMD_LINE" | "URL_DECODE" | "BASE64_DECODE" | "HEX_DECODE" | "MD5" | "REPLACE_COMMENTS" | "ESCAPE_SEQ_DECODE" | "SQL_HEX_DECODE" | "CSS_DECODE" | "JS_DECODE" | "NORMALIZE_PATH" | "NORMALIZE_PATH_WIN" | "REMOVE_NULLS" | "REPLACE_NULLS" | "BASE64_DECODE_EXT" | "URL_DECODE_UNI" | "UTF8_TO_UNICODE";
            })[];
          };
          HTTPMethod?: Record<string, unknown>;
          IP?: Record<string, unknown>;
          LabelNamespace?: {
            /**
             * The namespace to use for aggregation.
             * @pattern ^[0-9A-Za-z_:-]{1,1024}$
             */
            Namespace: string;
          };
          QueryArgument?: {
            /**
             * The name of the query argument to use.
             * @minLength 1
             * @maxLength 64
             * @pattern .*\S.*
             */
            Name: string;
            TextTransformations: ({
              Priority: number;
              Type: "NONE" | "COMPRESS_WHITE_SPACE" | "HTML_ENTITY_DECODE" | "LOWERCASE" | "CMD_LINE" | "URL_DECODE" | "BASE64_DECODE" | "HEX_DECODE" | "MD5" | "REPLACE_COMMENTS" | "ESCAPE_SEQ_DECODE" | "SQL_HEX_DECODE" | "CSS_DECODE" | "JS_DECODE" | "NORMALIZE_PATH" | "NORMALIZE_PATH_WIN" | "REMOVE_NULLS" | "REPLACE_NULLS" | "BASE64_DECODE_EXT" | "URL_DECODE_UNI" | "UTF8_TO_UNICODE";
            })[];
          };
          QueryString?: {
            TextTransformations: ({
              Priority: number;
              Type: "NONE" | "COMPRESS_WHITE_SPACE" | "HTML_ENTITY_DECODE" | "LOWERCASE" | "CMD_LINE" | "URL_DECODE" | "BASE64_DECODE" | "HEX_DECODE" | "MD5" | "REPLACE_COMMENTS" | "ESCAPE_SEQ_DECODE" | "SQL_HEX_DECODE" | "CSS_DECODE" | "JS_DECODE" | "NORMALIZE_PATH" | "NORMALIZE_PATH_WIN" | "REMOVE_NULLS" | "REPLACE_NULLS" | "BASE64_DECODE_EXT" | "URL_DECODE_UNI" | "UTF8_TO_UNICODE";
            })[];
          };
          UriPath?: {
            TextTransformations: ({
              Priority: number;
              Type: "NONE" | "COMPRESS_WHITE_SPACE" | "HTML_ENTITY_DECODE" | "LOWERCASE" | "CMD_LINE" | "URL_DECODE" | "BASE64_DECODE" | "HEX_DECODE" | "MD5" | "REPLACE_COMMENTS" | "ESCAPE_SEQ_DECODE" | "SQL_HEX_DECODE" | "CSS_DECODE" | "JS_DECODE" | "NORMALIZE_PATH" | "NORMALIZE_PATH_WIN" | "REMOVE_NULLS" | "REPLACE_NULLS" | "BASE64_DECODE_EXT" | "URL_DECODE_UNI" | "UTF8_TO_UNICODE";
            })[];
          };
          JA3Fingerprint?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior: "MATCH" | "NO_MATCH";
          };
          JA4Fingerprint?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior: "MATCH" | "NO_MATCH";
          };
          ASN?: Record<string, unknown>;
        })[];
        ScopeDownStatement?: unknown;
        ForwardedIPConfig?: {
          /** @pattern ^[a-zA-Z0-9-]+{1,255}$ */
          HeaderName: string;
          /** @enum ["MATCH","NO_MATCH"] */
          FallbackBehavior: "MATCH" | "NO_MATCH";
        };
      };
      AndStatement?: {
        Statements: unknown[];
      };
      OrStatement?: {
        Statements: unknown[];
      };
      NotStatement?: {
        Statement: unknown;
      };
      LabelMatchStatement?: {
        Scope: "LABEL" | "NAMESPACE";
        Key: string;
      };
      RegexMatchStatement?: {
        /**
         * @minLength 1
         * @maxLength 512
         */
        RegexString: string;
        FieldToMatch: {
          SingleHeader?: {
            Name: string;
          };
          /**
           * One query argument in a web request, identified by name, for example UserName or SalesRegion. The
           * name can be up to 30 characters long and isn't case sensitive.
           */
          SingleQueryArgument?: {
            Name: string;
          };
          /** All query arguments of a web request. */
          AllQueryArguments?: Record<string, unknown>;
          /**
           * The path component of the URI of a web request. This is the part of a web request that identifies a
           * resource, for example, /images/daily-ad.jpg.
           */
          UriPath?: Record<string, unknown>;
          /**
           * The query string of a web request. This is the part of a URL that appears after a ? character, if
           * any.
           */
          QueryString?: Record<string, unknown>;
          Body?: {
            OversizeHandling?: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          /**
           * The HTTP method of a web request. The method indicates the type of operation that the request is
           * asking the origin to perform.
           */
          Method?: Record<string, unknown>;
          JsonBody?: {
            MatchPattern: {
              /** Inspect all parts of the web request's JSON body. */
              All?: Record<string, unknown>;
              IncludedPaths?: string[];
            };
            MatchScope: "ALL" | "KEY" | "VALUE";
            InvalidFallbackBehavior?: "MATCH" | "NO_MATCH" | "EVALUATE_AS_STRING";
            OversizeHandling?: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          Headers?: {
            MatchPattern: {
              /** Inspect all parts of the web request headers. */
              All?: Record<string, unknown>;
              /**
               * @minItems 1
               * @maxItems 199
               */
              IncludedHeaders?: string[];
              /**
               * @minItems 1
               * @maxItems 199
               */
              ExcludedHeaders?: string[];
            };
            MatchScope: "ALL" | "KEY" | "VALUE";
            OversizeHandling: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          Cookies?: {
            MatchPattern: {
              /** Inspect all parts of the web request cookies. */
              All?: Record<string, unknown>;
              /**
               * @minItems 1
               * @maxItems 199
               */
              IncludedCookies?: string[];
              /**
               * @minItems 1
               * @maxItems 199
               */
              ExcludedCookies?: string[];
            };
            MatchScope: "ALL" | "KEY" | "VALUE";
            OversizeHandling: "CONTINUE" | "MATCH" | "NO_MATCH";
          };
          JA3Fingerprint?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior: "MATCH" | "NO_MATCH";
          };
          JA4Fingerprint?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior: "MATCH" | "NO_MATCH";
          };
          UriFragment?: {
            /** @enum ["MATCH","NO_MATCH"] */
            FallbackBehavior?: "MATCH" | "NO_MATCH";
          };
        };
        TextTransformations: ({
          Priority: number;
          Type: "NONE" | "COMPRESS_WHITE_SPACE" | "HTML_ENTITY_DECODE" | "LOWERCASE" | "CMD_LINE" | "URL_DECODE" | "BASE64_DECODE" | "HEX_DECODE" | "MD5" | "REPLACE_COMMENTS" | "ESCAPE_SEQ_DECODE" | "SQL_HEX_DECODE" | "CSS_DECODE" | "JS_DECODE" | "NORMALIZE_PATH" | "NORMALIZE_PATH_WIN" | "REMOVE_NULLS" | "REPLACE_NULLS" | "BASE64_DECODE_EXT" | "URL_DECODE_UNI" | "UTF8_TO_UNICODE";
        })[];
      };
      AsnMatchStatement?: {
        AsnList?: number[];
        ForwardedIPConfig?: {
          /** @pattern ^[a-zA-Z0-9-]+{1,255}$ */
          HeaderName: string;
          /** @enum ["MATCH","NO_MATCH"] */
          FallbackBehavior: "MATCH" | "NO_MATCH";
        };
      };
    };
    Action?: {
      Allow?: {
        CustomRequestHandling?: {
          /**
           * Collection of HTTP headers.
           * @minItems 1
           */
          InsertHeaders: {
            Name: string;
            Value: string;
          }[];
        };
      };
      Block?: {
        CustomResponse?: {
          ResponseCode: number;
          /**
           * Custom response body key.
           * @pattern ^[\w\-]+$
           */
          CustomResponseBodyKey?: string;
          /**
           * Collection of HTTP headers.
           * @minItems 1
           */
          ResponseHeaders?: {
            Name: string;
            Value: string;
          }[];
        };
      };
      Count?: {
        CustomRequestHandling?: {
          /**
           * Collection of HTTP headers.
           * @minItems 1
           */
          InsertHeaders: {
            Name: string;
            Value: string;
          }[];
        };
      };
      Captcha?: {
        CustomRequestHandling?: {
          /**
           * Collection of HTTP headers.
           * @minItems 1
           */
          InsertHeaders: {
            Name: string;
            Value: string;
          }[];
        };
      };
      Challenge?: {
        CustomRequestHandling?: {
          /**
           * Collection of HTTP headers.
           * @minItems 1
           */
          InsertHeaders: {
            Name: string;
            Value: string;
          }[];
        };
      };
    };
    /** Collection of Rule Labels. */
    RuleLabels?: {
      Name: string;
    }[];
    VisibilityConfig: {
      SampledRequestsEnabled: boolean;
      CloudWatchMetricsEnabled: boolean;
      /**
       * @minLength 1
       * @maxLength 128
       */
      MetricName: string;
    };
    CaptchaConfig?: {
      ImmunityTimeProperty?: {
        /**
         * @minimum 60
         * @maximum 259200
         */
        ImmunityTime: number;
      };
    };
    ChallengeConfig?: {
      ImmunityTimeProperty?: {
        /**
         * @minimum 60
         * @maximum 259200
         */
        ImmunityTime: number;
      };
    };
  })[];
  VisibilityConfig: {
    SampledRequestsEnabled: boolean;
    CloudWatchMetricsEnabled: boolean;
    /**
     * @minLength 1
     * @maxLength 128
     */
    MetricName: string;
  };
  /** @minItems 1 */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key?: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
  LabelNamespace?: string;
  CustomResponseBodies?: Record<string, {
    ContentType: "TEXT_PLAIN" | "TEXT_HTML" | "APPLICATION_JSON";
    Content: string;
  }>;
  /** Collection of Available Labels. */
  AvailableLabels?: {
    Name?: string;
  }[];
  /** Collection of Consumed Labels. */
  ConsumedLabels?: {
    Name?: string;
  }[];
};
