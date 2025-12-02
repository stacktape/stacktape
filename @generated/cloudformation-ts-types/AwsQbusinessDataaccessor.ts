// This file is auto-generated. Do not edit manually.
// Source: aws-qbusiness-dataaccessor.json

/** Definition of AWS::QBusiness::DataAccessor Resource Type */
export type AwsQbusinessDataaccessor = {
  /**
   * @minItems 1
   * @maxItems 10
   */
  ActionConfigurations: ({
    /** @pattern ^qbusiness:[a-zA-Z]+$ */
    Action: string;
    FilterConfiguration?: {
      DocumentAttributeFilter: {
        AndAllFilters?: unknown[];
        OrAllFilters?: unknown[];
        NotFilter?: unknown;
        EqualsTo?: {
          /**
           * @minLength 1
           * @maxLength 200
           * @pattern ^[a-zA-Z0-9_][a-zA-Z0-9_-]*$
           */
          Name: string;
          Value: {
            /** @maxLength 2048 */
            StringValue: string;
          } | {
            StringListValue: string[];
          } | {
            LongValue: number;
          } | {
            DateValue: string;
          };
        };
        ContainsAll?: {
          /**
           * @minLength 1
           * @maxLength 200
           * @pattern ^[a-zA-Z0-9_][a-zA-Z0-9_-]*$
           */
          Name: string;
          Value: {
            /** @maxLength 2048 */
            StringValue: string;
          } | {
            StringListValue: string[];
          } | {
            LongValue: number;
          } | {
            DateValue: string;
          };
        };
        ContainsAny?: {
          /**
           * @minLength 1
           * @maxLength 200
           * @pattern ^[a-zA-Z0-9_][a-zA-Z0-9_-]*$
           */
          Name: string;
          Value: {
            /** @maxLength 2048 */
            StringValue: string;
          } | {
            StringListValue: string[];
          } | {
            LongValue: number;
          } | {
            DateValue: string;
          };
        };
        GreaterThan?: {
          /**
           * @minLength 1
           * @maxLength 200
           * @pattern ^[a-zA-Z0-9_][a-zA-Z0-9_-]*$
           */
          Name: string;
          Value: {
            /** @maxLength 2048 */
            StringValue: string;
          } | {
            StringListValue: string[];
          } | {
            LongValue: number;
          } | {
            DateValue: string;
          };
        };
        GreaterThanOrEquals?: {
          /**
           * @minLength 1
           * @maxLength 200
           * @pattern ^[a-zA-Z0-9_][a-zA-Z0-9_-]*$
           */
          Name: string;
          Value: {
            /** @maxLength 2048 */
            StringValue: string;
          } | {
            StringListValue: string[];
          } | {
            LongValue: number;
          } | {
            DateValue: string;
          };
        };
        LessThan?: {
          /**
           * @minLength 1
           * @maxLength 200
           * @pattern ^[a-zA-Z0-9_][a-zA-Z0-9_-]*$
           */
          Name: string;
          Value: {
            /** @maxLength 2048 */
            StringValue: string;
          } | {
            StringListValue: string[];
          } | {
            LongValue: number;
          } | {
            DateValue: string;
          };
        };
        LessThanOrEquals?: {
          /**
           * @minLength 1
           * @maxLength 200
           * @pattern ^[a-zA-Z0-9_][a-zA-Z0-9_-]*$
           */
          Name: string;
          Value: {
            /** @maxLength 2048 */
            StringValue: string;
          } | {
            StringListValue: string[];
          } | {
            LongValue: number;
          } | {
            DateValue: string;
          };
        };
      };
    };
  })[];
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9-]{35}$
   */
  ApplicationId: string;
  AuthenticationDetail?: {
    AuthenticationType: "AWS_IAM_IDC_TTI" | "AWS_IAM_IDC_AUTH_CODE";
    AuthenticationConfiguration?: {
      IdcTrustedTokenIssuerConfiguration: {
        /**
         * @minLength 0
         * @maxLength 1284
         * @pattern ^arn:aws:sso::[0-9]{12}:trustedTokenIssuer/(sso)?ins-[a-zA-Z0-9-.]{16}/tti-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
         */
        IdcTrustedTokenIssuerArn: string;
      };
    };
    /**
     * @minItems 1
     * @maxItems 1
     */
    ExternalIds?: string[];
  };
  CreatedAt?: string;
  /**
   * @minLength 0
   * @maxLength 1284
   * @pattern ^arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}$
   */
  DataAccessorArn?: string;
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9-]{35}$
   */
  DataAccessorId?: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9_-]*$
   */
  DisplayName: string;
  /**
   * @minLength 10
   * @maxLength 1224
   * @pattern ^arn:(aws|aws-us-gov|aws-cn|aws-iso|aws-iso-b):sso::\d{12}:application/(sso)?ins-[a-zA-Z0-9-.]{16}/apl-[a-zA-Z0-9]{16}$
   */
  IdcApplicationArn?: string;
  /**
   * @minLength 1
   * @maxLength 1284
   * @pattern ^arn:aws:iam::[0-9]{12}:role/[a-zA-Z0-9_/+=,.@-]+$
   */
  Principal: string;
  /**
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  UpdatedAt?: string;
};
