// This file is auto-generated. Do not edit manually.
// Source: aws-eks-identityproviderconfig.json

/** An object representing an Amazon EKS IdentityProviderConfig. */
export type AwsEksIdentityproviderconfig = {
  /** The name of the identity provider configuration. */
  ClusterName: string;
  /**
   * The type of the identity provider configuration.
   * @enum ["oidc"]
   */
  Type: "oidc";
  /** The name of the OIDC provider configuration. */
  IdentityProviderConfigName?: string;
  Oidc?: {
    /**
     * This is also known as audience. The ID for the client application that makes authentication
     * requests to the OpenID identity provider.
     */
    ClientId: string;
    /** The JWT claim that the provider uses to return your groups. */
    GroupsClaim?: string;
    /**
     * The prefix that is prepended to group claims to prevent clashes with existing names (such as
     * system: groups).
     */
    GroupsPrefix?: string;
    /**
     * The URL of the OpenID identity provider that allows the API server to discover public signing keys
     * for verifying tokens.
     */
    IssuerUrl: string;
    /** @uniqueItems true */
    RequiredClaims?: {
      /**
       * The key of the requiredClaims.
       * @minLength 1
       * @maxLength 63
       */
      Key: string;
      /**
       * The value for the requiredClaims.
       * @minLength 1
       * @maxLength 253
       */
      Value: string;
    }[];
    /**
     * The JSON Web Token (JWT) claim to use as the username. The default is sub, which is expected to be
     * a unique identifier of the end user. You can choose other claims, such as email or name, depending
     * on the OpenID identity provider. Claims other than email are prefixed with the issuer URL to
     * prevent naming clashes with other plug-ins.
     */
    UsernameClaim?: string;
    /**
     * The prefix that is prepended to username claims to prevent clashes with existing names. If you do
     * not provide this field, and username is a value other than email, the prefix defaults to
     * issuerurl#. You can use the value - to disable all prefixing.
     */
    UsernamePrefix?: string;
  };
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
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
  /** The ARN of the configuration. */
  IdentityProviderConfigArn?: string;
};
