// This file is auto-generated. Do not edit manually.
// Source: aws-appsync-domainname.json

/** Resource Type definition for AWS::AppSync::DomainName */
export type AwsAppsyncDomainname = {
  /**
   * @minLength 1
   * @maxLength 253
   * @pattern ^(\*[a-z\d-]*\.)?([a-z\d-]+\.)+[a-z\d-]+$
   */
  DomainName: string;
  /**
   * @minLength 0
   * @maxLength 255
   */
  Description?: string;
  /**
   * @minLength 3
   * @maxLength 2048
   * @pattern ^arn:[a-z-]*:acm:[a-z0-9-]*:\d{12}:certificate/[0-9A-Za-z_/-]*$
   */
  CertificateArn: string;
  AppSyncDomainName?: string;
  HostedZoneId?: string;
  /** The Amazon Resource Name (ARN) for the Domain Name. */
  DomainNameArn?: string;
  Tags?: {
    /**
     * A string used to identify this tag. You can specify a value that is 1 to 128 Unicode characters in
     * length and cannot be prefixed with aws:. You can use any of the following characters: the set of
     * Unicode letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[ a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * A string containing the value for this tag. You can specify a maximum of 256 characters for a tag
     * value.
     * @minLength 0
     * @maxLength 256
     * @pattern ^[\s\w+-=\.:/@]*$
     */
    Value: string;
  }[];
};
