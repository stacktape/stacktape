// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-verifiedaccesstrustprovider.json

/** The AWS::EC2::VerifiedAccessTrustProvider type describes a verified access trust provider */
export type AwsEc2Verifiedaccesstrustprovider = {
  /** Type of trust provider. Possible values: user|device */
  TrustProviderType: string;
  /** The type of device-based trust provider. Possible values: jamf|crowdstrike */
  DeviceTrustProviderType?: string;
  /** The type of device-based trust provider. Possible values: oidc|iam-identity-center */
  UserTrustProviderType?: string;
  OidcOptions?: {
    /** The OIDC issuer. */
    Issuer?: string;
    /** The OIDC authorization endpoint. */
    AuthorizationEndpoint?: string;
    /** The OIDC token endpoint. */
    TokenEndpoint?: string;
    /** The OIDC user info endpoint. */
    UserInfoEndpoint?: string;
    /** The client identifier. */
    ClientId?: string;
    /** The client secret. */
    ClientSecret?: string;
    /**
     * OpenID Connect (OIDC) scopes are used by an application during authentication to authorize access
     * to details of a user. Each scope returns a specific set of user attributes.
     */
    Scope?: string;
  };
  DeviceOptions?: {
    /** The ID of the tenant application with the device-identity provider. */
    TenantId?: string;
    /** URL Verified Access will use to verify authenticity of the device tokens. */
    PublicSigningKeyUrl?: string;
  };
  /** The identifier to be used when working with policy rules. */
  PolicyReferenceName: string;
  /** The creation time. */
  CreationTime?: string;
  /** The last updated time. */
  LastUpdatedTime?: string;
  /** The ID of the Amazon Web Services Verified Access trust provider. */
  VerifiedAccessTrustProviderId?: string;
  /** A description for the Amazon Web Services Verified Access trust provider. */
  Description?: string;
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
  /** The configuration options for customer provided KMS encryption. */
  SseSpecification?: {
    /** KMS Key Arn used to encrypt the group policy */
    KmsKeyArn?: string;
    /** Whether to encrypt the policy with the provided key or disable encryption */
    CustomerManagedKeyEnabled?: boolean;
  };
  NativeApplicationOidcOptions?: {
    /** The OIDC issuer. */
    Issuer?: string;
    /** The OIDC authorization endpoint. */
    AuthorizationEndpoint?: string;
    /** The OIDC token endpoint. */
    TokenEndpoint?: string;
    /** The OIDC user info endpoint. */
    UserInfoEndpoint?: string;
    /** The client identifier. */
    ClientId?: string;
    /** The client secret. */
    ClientSecret?: string;
    /**
     * OpenID Connect (OIDC) scopes are used by an application during authentication to authorize access
     * to details of a user. Each scope returns a specific set of user attributes.
     */
    Scope?: string;
    /** The public signing key for endpoint */
    PublicSigningKeyEndpoint?: string;
  };
};
