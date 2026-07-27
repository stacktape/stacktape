// This file is auto-generated. Do not edit manually.
// Source: aws-verifiedpermissions-identitysource.json

/** Definition of AWS::VerifiedPermissions::IdentitySource Resource Type */
export type AwsVerifiedpermissionsIdentitysource = {
  Configuration: {
    CognitoUserPoolConfiguration: {
      /**
       * @minLength 1
       * @maxLength 255
       * @pattern ^arn:[a-zA-Z0-9-]+:cognito-idp:(([a-zA-Z0-9-]+:\d{12}:userpool/[\w-]+_[0-9a-zA-Z]+))$
       */
      UserPoolArn: string;
      /**
       * @minItems 0
       * @maxItems 1000
       */
      ClientIds?: string[];
      GroupConfiguration?: {
        /**
         * @minLength 1
         * @maxLength 200
         * @pattern ^([_a-zA-Z][_a-zA-Z0-9]*::)*[_a-zA-Z][_a-zA-Z0-9]*$
         */
        GroupEntityType: string;
      };
    };
  } | {
    OpenIdConnectConfiguration: {
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern ^https://.*$
       */
      Issuer: string;
      /**
       * @minLength 1
       * @maxLength 100
       */
      EntityIdPrefix?: string;
      GroupConfiguration?: {
        /** @minLength 1 */
        GroupClaim: string;
        /**
         * @minLength 1
         * @maxLength 200
         * @pattern ^([_a-zA-Z][_a-zA-Z0-9]*::)*[_a-zA-Z][_a-zA-Z0-9]*$
         */
        GroupEntityType: string;
      };
      TokenSelection: {
        AccessTokenOnly: {
          /**
           * @default "sub"
           * @minLength 1
           */
          PrincipalIdClaim?: string;
          /**
           * @minItems 1
           * @maxItems 255
           */
          Audiences?: string[];
        };
      } | {
        IdentityTokenOnly: {
          /**
           * @default "sub"
           * @minLength 1
           */
          PrincipalIdClaim?: string;
          /**
           * @minItems 0
           * @maxItems 1000
           */
          ClientIds?: string[];
        };
      };
    };
  };
  Details?: {
    /**
     * @minItems 0
     * @maxItems 1000
     */
    ClientIds?: string[];
    /**
     * @minLength 1
     * @maxLength 255
     * @pattern ^arn:[a-zA-Z0-9-]+:cognito-idp:(([a-zA-Z0-9-]+:\d{12}:userpool/[\w-]+_[0-9a-zA-Z]+))$
     */
    UserPoolArn?: string;
    /**
     * @minLength 1
     * @maxLength 2048
     * @pattern ^https://.*$
     */
    DiscoveryUrl?: string;
    OpenIdIssuer?: "COGNITO";
  };
  /**
   * @minLength 1
   * @maxLength 200
   * @pattern ^[a-zA-Z0-9-]*$
   */
  IdentitySourceId?: string;
  /**
   * @minLength 1
   * @maxLength 200
   * @pattern ^[a-zA-Z0-9-]*$
   */
  PolicyStoreId: string;
  /**
   * @minLength 1
   * @maxLength 200
   * @pattern ^.*$
   */
  PrincipalEntityType?: string;
};
