// This file is auto-generated. Do not edit manually.
// Source: aws-iotcoredeviceadvisor-suitedefinition.json

/** An example resource schema demonstrating some basic constructs and validation rules. */
export type AwsIotcoredeviceadvisorSuitedefinition = {
  SuiteDefinitionConfiguration: {
    DevicePermissionRoleArn: string;
    Devices?: {
      /**
       * @minLength 20
       * @maxLength 2048
       */
      CertificateArn?: string;
      /**
       * @minLength 20
       * @maxLength 2048
       */
      ThingArn?: string;
    }[];
    IntendedForQualification?: boolean;
    RootGroup: string;
    SuiteDefinitionName?: string;
  };
  /**
   * The unique identifier for the suite definition.
   * @minLength 12
   * @maxLength 36
   */
  SuiteDefinitionId?: string;
  /**
   * The Amazon Resource name for the suite definition.
   * @minLength 20
   * @maxLength 2048
   */
  SuiteDefinitionArn?: string;
  /**
   * The suite definition version of a test suite.
   * @minLength 2
   * @maxLength 255
   */
  SuiteDefinitionVersion?: string;
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
};
