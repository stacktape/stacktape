// This file is auto-generated. Do not edit manually.
// Source: aws-workspacesweb-ipaccesssettings.json

/** Definition of AWS::WorkSpacesWeb::IpAccessSettings Resource Type */
export type AwsWorkspaceswebIpaccesssettings = {
  AdditionalEncryptionContext?: Record<string, string>;
  AssociatedPortalArns?: string[];
  CreationDate?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[\w+=\/,.@-]+:kms:[a-zA-Z0-9\-]*:[a-zA-Z0-9]{1,12}:key\/[a-zA-Z0-9-]+$
   */
  CustomerManagedKey?: string;
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^.+$
   */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^.+$
   */
  DisplayName?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[\w+=\/,.@-]+:[a-zA-Z0-9\-]+:[a-zA-Z0-9\-]*:[a-zA-Z0-9]{1,12}:[a-zA-Z]+(\/[a-fA-F0-9\-]{36})+$
   */
  IpAccessSettingsArn?: string;
  /**
   * @minItems 1
   * @maxItems 100
   */
  IpRules: {
    /**
     * A single IP address or an IP address range in CIDR notation
     * @pattern ^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?:/([0-9]|[12][0-9]|3[0-2])|)$
     */
    IpRange: string;
    /**
     * @minLength 1
     * @maxLength 256
     * @pattern ^.+$
     */
    Description?: string;
  }[];
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
