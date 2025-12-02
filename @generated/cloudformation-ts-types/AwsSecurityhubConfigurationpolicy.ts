// This file is auto-generated. Do not edit manually.
// Source: aws-securityhub-configurationpolicy.json

/**
 * The AWS::SecurityHub::ConfigurationPolicy resource represents the Central Configuration Policy in
 * your account.
 */
export type AwsSecurityhubConfigurationpolicy = {
  /**
   * The Amazon Resource Name (ARN) of the configuration policy.
   * @pattern ^arn:aws\S*:securityhub:[a-z0-9-]+:[0-9]{12}:configuration-policy/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
   */
  Arn?: string;
  /**
   * The name of the configuration policy.
   * @minLength 1
   * @maxLength 128
   */
  Name: string;
  /**
   * The description of the configuration policy.
   * @minLength 0
   * @maxLength 512
   */
  Description?: string;
  ConfigurationPolicy: {
    SecurityHub?: {
      /**
       * A list that defines which security standards are enabled in the configuration policy.
       * @maxItems 1000
       * @uniqueItems true
       */
      EnabledStandardIdentifiers?: string[];
      /** Indicates whether Security Hub is enabled in the policy. */
      ServiceEnabled?: boolean;
      SecurityControlsConfiguration?: {
        /**
         * A list of security controls that are disabled in the configuration policy
         * @maxItems 1000
         * @uniqueItems true
         */
        DisabledSecurityControlIdentifiers?: string[];
        /**
         * A list of security controls that are enabled in the configuration policy.
         * @maxItems 1000
         * @uniqueItems true
         */
        EnabledSecurityControlIdentifiers?: string[];
        /**
         * A list of security controls and control parameter values that are included in a configuration
         * policy.
         * @maxItems 1000
         * @uniqueItems true
         */
        SecurityControlCustomParameters?: ({
          /** An object that specifies parameter values for a control in a configuration policy. */
          Parameters?: Record<string, {
            /**
             * Identifies whether a control parameter uses a custom user-defined value or subscribes to the
             * default AWS Security Hub behavior.
             * @enum ["DEFAULT","CUSTOM"]
             */
            ValueType: "DEFAULT" | "CUSTOM";
            Value?: {
              /** A control parameter that is a boolean. */
              Boolean?: boolean;
              /** A control parameter that is a double. */
              Double?: number;
              /**
               * A control parameter that is an enum.
               * @maxLength 2048
               */
              Enum?: string;
              /**
               * A control parameter that is a list of enums.
               * @maxItems 100
               * @uniqueItems true
               */
              EnumList?: string[];
              /** A control parameter that is an integer. */
              Integer?: number;
              /**
               * A control parameter that is a list of integers.
               * @maxItems 100
               * @uniqueItems true
               */
              IntegerList?: number[];
              /**
               * A control parameter that is a string.
               * @maxLength 2048
               */
              String?: string;
              /**
               * A control parameter that is a list of strings.
               * @maxItems 100
               * @uniqueItems true
               */
              StringList?: string[];
            };
          }>;
          /**
           * The ID of the security control.
           * @maxLength 2048
           */
          SecurityControlId?: string;
        })[];
      };
    };
  };
  /**
   * The universally unique identifier (UUID) of the configuration policy.
   * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
   */
  Id?: string;
  /** The date and time, in UTC and ISO 8601 format. */
  CreatedAt?: string;
  /** The date and time, in UTC and ISO 8601 format. */
  UpdatedAt?: string;
  /** Indicates whether the service that the configuration policy applies to is enabled in the policy. */
  ServiceEnabled?: boolean;
  Tags?: Record<string, string>;
};
