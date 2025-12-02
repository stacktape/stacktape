// This file is auto-generated. Do not edit manually.
// Source: aws-datazone-projectprofile.json

/** Definition of AWS::DataZone::ProjectProfile Resource Type */
export type AwsDatazoneProjectprofile = {
  CreatedAt?: string;
  CreatedBy?: string;
  /** @maxLength 2048 */
  Description?: string;
  /** @pattern ^dzd[_-][a-zA-Z0-9_-]{1,36}$ */
  DomainId?: string;
  /** @pattern ^dzd[_-][a-zA-Z0-9_-]{1,36}$ */
  DomainIdentifier?: string;
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-z0-9_\-]+$
   */
  DomainUnitId?: string;
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-z0-9_\-]+$
   */
  DomainUnitIdentifier?: string;
  EnvironmentConfigurations?: ({
    /**
     * @minLength 1
     * @maxLength 64
     * @pattern ^[\w -]+$
     */
    Name: string;
    /** @pattern ^[a-zA-Z0-9_-]{1,36}$ */
    EnvironmentConfigurationId?: string;
    /** @pattern ^[a-zA-Z0-9_-]{1,36}$ */
    EnvironmentBlueprintId: string;
    /** @maxLength 2048 */
    Description?: string;
    DeploymentMode?: "ON_CREATE" | "ON_DEMAND";
    ConfigurationParameters?: {
      /**
       * @minLength 1
       * @maxLength 2048
       */
      SsmPath?: string;
      ParameterOverrides?: {
        /** @pattern ^[a-zA-Z_][a-zA-Z0-9_]*$ */
        Name?: string;
        Value?: string;
        IsEditable?: boolean;
      }[];
      ResolvedParameters?: {
        /** @pattern ^[a-zA-Z_][a-zA-Z0-9_]*$ */
        Name?: string;
        Value?: string;
        IsEditable?: boolean;
      }[];
    };
    AwsAccount?: {
      /** @pattern ^\d{12}$ */
      AwsAccountId: string;
    };
    AwsRegion: {
      /**
       * @minLength 4
       * @maxLength 16
       * @pattern ^[a-z]{2}-?(iso|gov)?-{1}[a-z]*-{1}[0-9]$
       */
      RegionName: string;
    };
    /**
     * @minimum 0
     * @maximum 16
     */
    DeploymentOrder?: number;
  })[];
  /** @pattern ^[a-zA-Z0-9_-]{1,36}$ */
  Id?: string;
  /** @pattern ^[a-zA-Z0-9_-]{1,36}$ */
  Identifier?: string;
  LastUpdatedAt?: string;
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[\w -]+$
   */
  Name: string;
  Status?: "ENABLED" | "DISABLED";
};
