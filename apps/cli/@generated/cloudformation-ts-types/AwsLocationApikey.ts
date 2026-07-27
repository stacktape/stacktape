// This file is auto-generated. Do not edit manually.
// Source: aws-location-apikey.json

/** Definition of AWS::Location::APIKey Resource Type */
export type AwsLocationApikey = {
  CreateTime?: string;
  /**
   * @minLength 0
   * @maxLength 1000
   */
  Description?: string;
  ExpireTime?: string;
  ForceUpdate?: boolean;
  /**
   * @maxLength 1600
   * @pattern ^arn(:[a-z0-9]+([.-][a-z0-9]+)*){2}(:([a-z0-9]+([.-][a-z0-9]+)*)?){2}:([^/].*)?$
   */
  KeyArn?: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[-._\w]+$
   */
  KeyName: string;
  NoExpiry?: boolean;
  Restrictions: {
    /**
     * @minItems 1
     * @maxItems 24
     */
    AllowActions: string[];
    /**
     * @minItems 1
     * @maxItems 8
     */
    AllowResources: string[];
    /**
     * @minItems 0
     * @maxItems 5
     */
    AllowReferers?: string[];
    /**
     * @minItems 0
     * @maxItems 5
     */
    AllowAndroidApps?: {
      /**
       * @minLength 1
       * @maxLength 255
       * @pattern ^([A-Za-z][A-Za-z\d_]*\.)+[A-Za-z][A-Za-z\d_]*$
       */
      Package: string;
      /**
       * @minLength 59
       * @maxLength 59
       * @pattern ^([A-Fa-f0-9]{2}:){19}[A-Fa-f0-9]{2}$
       */
      CertificateFingerprint: string;
    }[];
    /**
     * @minItems 0
     * @maxItems 5
     */
    AllowAppleApps?: {
      /**
       * @minLength 1
       * @maxLength 155
       * @pattern ^[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)+$
       */
      BundleId: string;
    }[];
  };
  /**
   * An array of key-value pairs to apply to this resource.
   * @minItems 0
   * @maxItems 200
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     * @pattern ^[A-Za-z0-9 _=@:.+-/]*$
     */
    Value: string;
  }[];
  UpdateTime?: string;
  ForceDelete?: boolean;
  /**
   * @maxLength 1600
   * @pattern ^arn(:[a-z0-9]+([.-][a-z0-9]+)*){2}(:([a-z0-9]+([.-][a-z0-9]+)*)?){2}:([^/].*)?$
   */
  Arn?: string;
};
