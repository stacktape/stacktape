// This file is auto-generated. Do not edit manually.
// Source: aws-workspacesthinclient-environment.json

/** Resource type definition for AWS::WorkSpacesThinClient::Environment. */
export type AwsWorkspacesthinclientEnvironment = {
  /**
   * Unique identifier of the environment.
   * @pattern ^[a-z0-9]{9}$
   */
  Id?: string;
  /**
   * The name of the environment.
   * @minLength 1
   * @maxLength 64
   * @pattern ^.+$
   */
  Name?: string;
  /**
   * The Amazon Resource Name (ARN) of the desktop to stream from Amazon WorkSpaces, WorkSpaces Web, or
   * AppStream 2.0.
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[\w+=\/,.@-]+:[a-zA-Z0-9\-]+:[a-zA-Z0-9\-]*:[0-9]{0,12}:[a-zA-Z0-9\-\/\._]+$
   */
  DesktopArn: string;
  /**
   * The URL for the identity provider login (only for environments that use AppStream 2.0).
   * @minLength 1
   * @maxLength 1024
   * @pattern ^(https:\/\/)[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,32}(:[0-9]{1,5})?(\/.*)?$
   */
  DesktopEndpoint?: string;
  /**
   * The type of VDI.
   * @enum ["workspaces","appstream","workspaces-web"]
   */
  DesktopType?: "workspaces" | "appstream" | "workspaces-web";
  /**
   * Activation code for devices associated with environment.
   * @pattern ^[a-z]{2}[a-z0-9]{6}$
   */
  ActivationCode?: string;
  /**
   * Number of devices registered to the environment.
   * @minimum 0
   */
  RegisteredDevicesCount?: number;
  /**
   * An option to define if software updates should be applied within a maintenance window.
   * @enum ["USE_MAINTENANCE_WINDOW","APPLY_IMMEDIATELY"]
   */
  SoftwareSetUpdateSchedule?: "USE_MAINTENANCE_WINDOW" | "APPLY_IMMEDIATELY";
  /** A specification for a time window to apply software updates. */
  MaintenanceWindow?: {
    /**
     * The type of maintenance window.
     * @enum ["SYSTEM","CUSTOM"]
     */
    Type: "SYSTEM" | "CUSTOM";
    /** The hour start time of maintenance window. */
    StartTimeHour?: number;
    /** The minute start time of maintenance window. */
    StartTimeMinute?: number;
    /** The hour end time of maintenance window. */
    EndTimeHour?: number;
    /** The minute end time of maintenance window. */
    EndTimeMinute?: number;
    /**
     * The date of maintenance window.
     * @minItems 1
     * @maxItems 7
     * @uniqueItems true
     */
    DaysOfTheWeek?: ("MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY")[];
    /**
     * The desired time zone maintenance window.
     * @enum ["UTC","DEVICE"]
     */
    ApplyTimeOf?: "UTC" | "DEVICE";
  };
  /**
   * An option to define which software updates to apply.
   * @enum ["USE_LATEST","USE_DESIRED"]
   */
  SoftwareSetUpdateMode?: "USE_LATEST" | "USE_DESIRED";
  /**
   * The ID of the software set to apply.
   * @pattern ^[0-9]{1,9}$
   */
  DesiredSoftwareSetId?: string;
  /**
   * The ID of the software set that is pending to be installed.
   * @pattern ^[0-9]{1,9}$
   */
  PendingSoftwareSetId?: string;
  /** The version of the software set that is pending to be installed. */
  PendingSoftwareSetVersion?: string;
  /**
   * Describes if the software currently installed on all devices in the environment is a supported
   * version.
   * @enum ["COMPLIANT","NOT_COMPLIANT","NO_REGISTERED_DEVICES"]
   */
  SoftwareSetComplianceStatus?: "COMPLIANT" | "NOT_COMPLIANT" | "NO_REGISTERED_DEVICES";
  /** The timestamp in unix epoch format when environment was created. */
  CreatedAt?: string;
  /** The timestamp in unix epoch format when environment was last updated. */
  UpdatedAt?: string;
  /**
   * The environment ARN.
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[\w+=\/,.@-]+:[a-zA-Z0-9\-]+:[a-zA-Z0-9\-]*:[0-9]{0,12}:[a-zA-Z0-9\-\/\._]+$
   */
  Arn?: string;
  /**
   * The Amazon Resource Name (ARN) of the AWS Key Management Service key used to encrypt the
   * environment.
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[\w+=\/,.@-]+:kms:[a-zA-Z0-9\-]*:[0-9]{0,12}:key\/[a-zA-Z0-9-]+$
   */
  KmsKeyArn?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * An array of key-value pairs to apply to the newly created devices for this environment.
   * @maxItems 50
   * @uniqueItems true
   */
  DeviceCreationTags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @maxLength 256
     */
    Value: string;
  }[];
};
