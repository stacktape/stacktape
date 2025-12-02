// This file is auto-generated. Do not edit manually.
// Source: aws-mpa-identitysource.json

/** Resource Type definition for AWS::MPA::IdentitySource. */
export type AwsMpaIdentitysource = {
  IdentitySourceArn?: string;
  IdentitySourceParameters: {
    IamIdentityCenter: {
      /** @pattern ^arn:.+:sso:::instance/(?:sso)?ins-[a-zA-Z0-9-.]{16}$ */
      InstanceArn: string;
      Region: string;
      ApprovalPortalUrl?: string;
    };
  };
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Value: string;
  }[];
  IdentitySourceType?: string;
  CreationTime?: string;
  Status?: string;
  StatusCode?: string;
  StatusMessage?: string;
};
