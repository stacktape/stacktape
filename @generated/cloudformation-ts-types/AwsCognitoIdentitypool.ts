// This file is auto-generated. Do not edit manually.
// Source: aws-cognito-identitypool.json

/** Resource Type definition for AWS::Cognito::IdentityPool */
export type AwsCognitoIdentitypool = {
  PushSync?: {
    /** @uniqueItems false */
    ApplicationArns?: string[];
    RoleArn?: string;
  };
  /** @uniqueItems false */
  CognitoIdentityProviders?: {
    ServerSideTokenCheck?: boolean;
    ProviderName: string;
    ClientId: string;
  }[];
  DeveloperProviderName?: string;
  CognitoStreams?: {
    StreamingStatus?: string;
    StreamName?: string;
    RoleArn?: string;
  };
  SupportedLoginProviders?: Record<string, unknown>;
  Name?: string;
  CognitoEvents?: Record<string, unknown>;
  Id?: string;
  IdentityPoolName?: string;
  AllowUnauthenticatedIdentities: boolean;
  /** @uniqueItems false */
  SamlProviderARNs?: string[];
  /** @uniqueItems false */
  OpenIdConnectProviderARNs?: string[];
  AllowClassicFlow?: boolean;
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  IdentityPoolTags?: {
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
    Value: string;
  }[];
};
