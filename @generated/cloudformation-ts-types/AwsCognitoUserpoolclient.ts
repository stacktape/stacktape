// This file is auto-generated. Do not edit manually.
// Source: aws-cognito-userpoolclient.json

/** Resource Type definition for AWS::Cognito::UserPoolClient */
export type AwsCognitoUserpoolclient = {
  /**
   * @minLength 1
   * @maxLength 128
   */
  ClientName?: string;
  ExplicitAuthFlows?: string[];
  GenerateSecret?: boolean;
  ReadAttributes?: string[];
  /**
   * @minimum 3
   * @maximum 15
   */
  AuthSessionValidity?: number;
  /**
   * @minimum 1
   * @maximum 315360000
   */
  RefreshTokenValidity?: number;
  /**
   * @minimum 1
   * @maximum 86400
   */
  AccessTokenValidity?: number;
  /**
   * @minimum 1
   * @maximum 86400
   */
  IdTokenValidity?: number;
  TokenValidityUnits?: {
    AccessToken?: string;
    IdToken?: string;
    RefreshToken?: string;
  };
  RefreshTokenRotation?: {
    /** @enum ["ENABLED","DISABLED"] */
    Feature?: "ENABLED" | "DISABLED";
    /**
     * @minimum 0
     * @maximum 60
     */
    RetryGracePeriodSeconds?: number;
  };
  UserPoolId: string;
  WriteAttributes?: string[];
  AllowedOAuthFlows?: string[];
  AllowedOAuthFlowsUserPoolClient?: boolean;
  AllowedOAuthScopes?: string[];
  CallbackURLs?: string[];
  DefaultRedirectURI?: string;
  LogoutURLs?: string[];
  SupportedIdentityProviders?: string[];
  AnalyticsConfiguration?: {
    ApplicationArn?: string;
    ApplicationId?: string;
    ExternalId?: string;
    RoleArn?: string;
    UserDataShared?: boolean;
  };
  PreventUserExistenceErrors?: string;
  EnableTokenRevocation?: boolean;
  EnablePropagateAdditionalUserContextData?: boolean;
  Name?: string;
  ClientSecret?: string;
  ClientId?: string;
};
