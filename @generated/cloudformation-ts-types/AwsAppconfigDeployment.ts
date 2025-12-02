// This file is auto-generated. Do not edit manually.
// Source: aws-appconfig-deployment.json

/** Resource Type definition for AWS::AppConfig::Deployment */
export type AwsAppconfigDeployment = {
  /** The deployment strategy ID. */
  DeploymentStrategyId: string;
  /** The configuration profile ID. */
  ConfigurationProfileId: string;
  /** The environment ID. */
  EnvironmentId: string;
  /**
   * The AWS Key Management Service key identifier (key ID, key alias, or key ARN) provided when the
   * resource was created or updated.
   * @pattern ^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}|alias/[a-zA-Z0-9/_-]{1,250}|arn:aws[a-zA-Z-]*:kms:[a-z]{2}(-gov|-iso(b?))?-[a-z]+-\d{1}:\d{12}:(key/[0-9a-f-]{36}|alias/[a-zA-Z0-9/_-]{1,250})$
   */
  KmsKeyIdentifier?: string;
  /** A description of the deployment. */
  Description?: string;
  /**
   * The configuration version to deploy. If deploying an AWS AppConfig hosted configuration version,
   * you can specify either the version number or version label. For all other configurations, you must
   * specify the version number.
   */
  ConfigurationVersion: string;
  /**
   * The state of the deployment.
   * @enum ["BAKING","VALIDATING","DEPLOYING","COMPLETE","ROLLING_BACK","ROLLED_BACK","REVERTED"]
   */
  State?: "BAKING" | "VALIDATING" | "DEPLOYING" | "COMPLETE" | "ROLLING_BACK" | "ROLLED_BACK" | "REVERTED";
  /** The sequence number of the deployment. */
  DeploymentNumber?: string;
  /** The application ID. */
  ApplicationId: string;
  /** @uniqueItems false */
  DynamicExtensionParameters?: {
    ParameterValue?: string;
    ExtensionReference?: string;
    ParameterName?: string;
  }[];
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /** The tag value can be up to 256 characters. */
    Value?: string;
    /**
     * The key-value string map. The valid character set is [a-zA-Z1-9+-=._:/]. The tag key can be up to
     * 128 characters and must not start with aws:.
     */
    Key?: string;
  }[];
};
