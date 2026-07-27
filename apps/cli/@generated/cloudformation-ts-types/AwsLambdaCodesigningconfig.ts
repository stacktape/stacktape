// This file is auto-generated. Do not edit manually.
// Source: aws-lambda-codesigningconfig.json

/** Resource Type definition for AWS::Lambda::CodeSigningConfig. */
export type AwsLambdaCodesigningconfig = {
  /**
   * A description of the CodeSigningConfig
   * @minLength 0
   * @maxLength 256
   */
  Description?: string;
  /**
   * When the CodeSigningConfig is later on attached to a function, the function code will be expected
   * to be signed by profiles from this list
   */
  AllowedPublishers: {
    /**
     * List of Signing profile version Arns
     * @minItems 1
     * @maxItems 20
     */
    SigningProfileVersionArns: string[];
  };
  /** Policies to control how to act if a signature is invalid */
  CodeSigningPolicies?: {
    /**
     * Indicates how Lambda operations involve updating the code artifact will operate. Default to Warn if
     * not provided
     * @default "Warn"
     * @enum ["Warn","Enforce"]
     */
    UntrustedArtifactOnDeployment: "Warn" | "Enforce";
  };
  /**
   * A unique identifier for CodeSigningConfig resource
   * @pattern csc-[a-zA-Z0-9-_\.]{17}
   */
  CodeSigningConfigId?: string;
  /**
   * A unique Arn for CodeSigningConfig resource
   * @pattern arn:(aws[a-zA-Z-]*)?:lambda:[a-z]{2}((-gov)|(-iso(b?)))?-[a-z]+-\d{1}:\d{12}:code-signing-config:csc-[a-z0-9]{17}
   */
  CodeSigningConfigArn?: string;
  /**
   * A list of tags to apply to CodeSigningConfig resource
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
    Value?: string;
  }[];
};
