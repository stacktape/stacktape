// This file is auto-generated. Do not edit manually.
// Source: aws-vpclattice-rule.json

/**
 * Creates a listener rule. Each listener has a default rule for checking connection requests, but you
 * can define additional rules. Each rule consists of a priority, one or more actions, and one or more
 * conditions.
 */
export type AwsVpclatticeRule = {
  Action: {
    Forward?: {
      /**
       * @minItems 1
       * @maxItems 10
       */
      TargetGroups: {
        /**
         * @minLength 20
         * @maxLength 2048
         * @pattern ^((tg-[0-9a-z]{17})|(arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:targetgroup/tg-[0-9a-z]{17}))$
         */
        TargetGroupIdentifier: string;
        /**
         * @minimum 1
         * @maximum 999
         */
        Weight?: number;
      }[];
    };
    FixedResponse?: {
      /**
       * @minimum 100
       * @maximum 599
       */
      StatusCode: number;
    };
  };
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn(:[a-z0-9]+([.-][a-z0-9]+)*){2}(:([a-z0-9]+([.-][a-z0-9]+)*)?){2}:service/svc-[0-9a-z]{17}/listener/listener-[0-9a-z]{17}/rule/((rule-[0-9a-z]{17})|(default))$
   */
  Arn?: string;
  /**
   * @minLength 7
   * @maxLength 22
   * @pattern ^((rule-[0-9a-z]{17})|(default))$
   */
  Id?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^((listener-[0-9a-z]{17})|(arn(:[a-z0-9]+([.-][a-z0-9]+)*){2}(:([a-z0-9]+([.-][a-z0-9]+)*)?){2}:service/svc-[0-9a-z]{17}/listener/listener-[0-9a-z]{17}))$
   */
  ListenerIdentifier?: string;
  Match: {
    HttpMatch: {
      /** @enum ["CONNECT","DELETE","GET","HEAD","OPTIONS","POST","PUT","TRACE"] */
      Method?: "CONNECT" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "POST" | "PUT" | "TRACE";
      PathMatch?: {
        Match: {
          /**
           * @minLength 1
           * @maxLength 128
           * @pattern ^\/[a-zA-Z0-9@:%_+.~#?&\/=-]*$
           */
          Exact?: string;
          /**
           * @minLength 1
           * @maxLength 128
           * @pattern ^\/[a-zA-Z0-9@:%_+.~#?&\/=-]*$
           */
          Prefix?: string;
        };
        /** @default false */
        CaseSensitive?: boolean;
      };
      /** @maxItems 5 */
      HeaderMatches?: {
        /**
         * @minLength 1
         * @maxLength 40
         */
        Name: string;
        Match: {
          /**
           * @minLength 1
           * @maxLength 128
           */
          Exact?: string;
          /**
           * @minLength 1
           * @maxLength 128
           */
          Prefix?: string;
          /**
           * @minLength 1
           * @maxLength 128
           */
          Contains?: string;
        };
        /** @default false */
        CaseSensitive?: boolean;
      }[];
    };
  };
  /**
   * @minLength 3
   * @maxLength 63
   * @pattern ^(?!rule-)(?![-])(?!.*[-]$)(?!.*[-]{2})[a-z0-9-]+$
   */
  Name?: string;
  /**
   * @minimum 1
   * @maximum 100
   */
  Priority: number;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^((svc-[0-9a-z]{17})|(arn(:[a-z0-9]+([.-][a-z0-9]+)*){2}(:([a-z0-9]+([.-][a-z0-9]+)*)?){2}:service/svc-[0-9a-z]{17}))$
   */
  ServiceIdentifier?: string;
  /**
   * @minItems 0
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
