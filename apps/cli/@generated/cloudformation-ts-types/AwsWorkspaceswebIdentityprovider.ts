// This file is auto-generated. Do not edit manually.
// Source: aws-workspacesweb-identityprovider.json

/** Definition of AWS::WorkSpacesWeb::IdentityProvider Resource Type */
export type AwsWorkspaceswebIdentityprovider = {
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[\w+=\/,.@-]+:[a-zA-Z0-9\-]+:[a-zA-Z0-9\-]*:[a-zA-Z0-9]{1,12}:[a-zA-Z]+(\/[a-fA-F0-9\-]{36}){2,}$
   */
  IdentityProviderArn?: string;
  IdentityProviderDetails: Record<string, string>;
  /**
   * @minLength 1
   * @maxLength 32
   * @pattern ^[^_][\p{L}\p{M}\p{S}\p{N}\p{P}][^_]+$
   */
  IdentityProviderName: string;
  IdentityProviderType: "SAML" | "Facebook" | "Google" | "LoginWithAmazon" | "SignInWithApple" | "OIDC";
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[\w+=\/,.@-]+:[a-zA-Z0-9\-]+:[a-zA-Z0-9\-]*:[a-zA-Z0-9]{1,12}:[a-zA-Z]+(\/[a-fA-F0-9\-]{36})+$
   */
  PortalArn?: string;
  /**
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Value: string;
  }[];
};
