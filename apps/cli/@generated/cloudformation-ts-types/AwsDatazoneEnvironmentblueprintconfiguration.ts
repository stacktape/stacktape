// This file is auto-generated. Do not edit manually.
// Source: aws-datazone-environmentblueprintconfiguration.json

/** Definition of AWS::DataZone::EnvironmentBlueprintConfiguration Resource Type */
export type AwsDatazoneEnvironmentblueprintconfiguration = {
  CreatedAt?: string;
  /** @minItems 0 */
  EnabledRegions: string[];
  /** @pattern ^[a-zA-Z0-9_-]{1,36}$ */
  EnvironmentBlueprintIdentifier: string;
  /** @pattern ^[a-zA-Z0-9_-]{1,36}$ */
  EnvironmentBlueprintId?: string;
  UpdatedAt?: string;
  /** @uniqueItems true */
  RegionalParameters?: {
    Parameters?: Record<string, string>;
    /** @pattern ^[a-z]{2}-?(iso|gov)?-{1}[a-z]*-{1}[0-9]$ */
    Region?: string;
  }[];
  /** @pattern ^arn:aws[^:]*:iam::\d{12}:role(/[a-zA-Z0-9+=,.@_-]+)*/[a-zA-Z0-9+=,.@_-]+$ */
  ProvisioningRoleArn?: string;
  /** @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$ */
  DomainId?: string;
  ProvisioningConfigurations?: {
    LakeFormationConfiguration: {
      /**
       * @minItems 0
       * @maxItems 20
       */
      LocationRegistrationExcludeS3Locations?: string[];
      /** @pattern ^arn:aws[^:]*:iam::\d{12}:role(/[a-zA-Z0-9+=,.@_-]+)*/[a-zA-Z0-9+=,.@_-]+$ */
      LocationRegistrationRole?: string;
    };
  }[];
  /** @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$ */
  DomainIdentifier: string;
  /** @pattern ^arn:aws[^:]*:iam::(aws|\d{12}):policy/[\w+=,.@-]*$ */
  EnvironmentRolePermissionBoundary?: string;
  /** @pattern ^arn:aws[^:]*:iam::\d{12}:role(/[a-zA-Z0-9+=,.@_-]+)*/[a-zA-Z0-9+=,.@_-]+$ */
  ManageAccessRoleArn?: string;
};
