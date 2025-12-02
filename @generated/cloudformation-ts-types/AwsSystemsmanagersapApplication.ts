// This file is auto-generated. Do not edit manually.
// Source: aws-systemsmanagersap-application.json

/** Resource schema for AWS::SystemsManagerSAP::Application */
export type AwsSystemsmanagersapApplication = {
  /** @pattern [\w\d\.-]{1,60} */
  ApplicationId: string;
  /** @enum ["HANA","SAP_ABAP"] */
  ApplicationType: "HANA" | "SAP_ABAP";
  /**
   * The ARN of the SSM-SAP application
   * @pattern ^arn:(.+:){2,4}.+$|^arn:(.+:){1,3}.+\/.+$
   */
  Arn?: string;
  /** @minItems 1 */
  Credentials?: {
    /** @pattern ^(?=.{1,100}$).* */
    DatabaseName?: string;
    /** @enum ["ADMIN"] */
    CredentialType?: "ADMIN";
    /** @pattern ^(?=.{1,100}$).* */
    SecretId?: string;
  }[];
  /** @minItems 1 */
  Instances?: string[];
  /** @pattern [0-9]{2} */
  SapInstanceNumber?: string;
  /** @pattern [A-Z][A-Z0-9]{2} */
  Sid?: string;
  /** The tags of a SystemsManagerSAP application. */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * The ARN of the SAP HANA database
   * @pattern ^arn:(.+:){2,4}.+$|^arn:(.+:){1,3}.+\/.+$
   */
  DatabaseArn?: string;
  /**
   * This is an optional parameter for component details to which the SAP ABAP application is attached,
   * such as Web Dispatcher.
   * @minItems 1
   */
  ComponentsInfo?: ({
    /** @enum ["HANA","HANA_NODE","ABAP","ASCS","DIALOG","WEBDISP","WD","ERS"] */
    ComponentType?: "HANA" | "HANA_NODE" | "ABAP" | "ASCS" | "DIALOG" | "WEBDISP" | "WD" | "ERS";
    /** @pattern ^i-[\w\d]{8}$|^i-[\w\d]{17}$ */
    Ec2InstanceId?: string;
    /** @pattern [A-Z][A-Z0-9]{2} */
    Sid?: string;
  })[];
};
