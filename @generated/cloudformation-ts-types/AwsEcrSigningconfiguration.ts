// This file is auto-generated. Do not edit manually.
// Source: aws-ecr-signingconfiguration.json

/**
 * The AWS::ECR::SigningConfiguration resource creates or updates the signing configuration for an
 * Amazon ECR registry.
 */
export type AwsEcrSigningconfiguration = {
  /**
   * 12-digit AWS account ID of the ECR registry.
   * @pattern ^[0-9]{12}$
   */
  RegistryId?: string;
  /**
   * Array of signing rules that define which repositories should be signed and with which signing
   * profiles.
   * @minItems 0
   * @maxItems 50
   */
  Rules: {
    /**
     * AWS Signer signing profile ARN to use for matched repositories.
     * @maxLength 200
     * @pattern ^arn:aws(-[a-z]+)*:signer:[a-z0-9-]+:[0-9]{12}:\/signing-profiles\/[a-zA-Z0-9_]{2,}$
     */
    SigningProfileArn: string;
    /**
     * Optional array of repository filters. If omitted, the rule matches all repositories. If provided,
     * must contain at least one filter. Empty arrays are not allowed.
     * @minItems 1
     * @maxItems 100
     */
    RepositoryFilters?: {
      Filter: string;
      FilterType: "WILDCARD_MATCH";
    }[];
  }[];
};
