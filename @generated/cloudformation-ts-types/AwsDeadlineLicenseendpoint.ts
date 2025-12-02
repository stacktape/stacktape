// This file is auto-generated. Do not edit manually.
// Source: aws-deadline-licenseendpoint.json

/** Definition of AWS::Deadline::LicenseEndpoint Resource Type */
export type AwsDeadlineLicenseendpoint = {
  DnsName?: string;
  /** @pattern ^le-[0-9a-f]{32}$ */
  LicenseEndpointId?: string;
  /**
   * @minItems 1
   * @maxItems 10
   */
  SecurityGroupIds: string[];
  Status?: "CREATE_IN_PROGRESS" | "DELETE_IN_PROGRESS" | "READY" | "NOT_READY";
  /**
   * @minLength 0
   * @maxLength 1024
   */
  StatusMessage?: string;
  /**
   * @minItems 1
   * @maxItems 10
   */
  SubnetIds: string[];
  /**
   * @minLength 1
   * @maxLength 32
   */
  VpcId: string;
  /** @pattern ^arn:(aws[a-zA-Z-]*):deadline:[a-z0-9-]+:[0-9]{12}:license-endpoint/le-[0-9a-z]{32} */
  Arn?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 127
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 255
     */
    Value: string;
  }[];
};
