// This file is auto-generated. Do not edit manually.
// Source: aws-datazone-environment.json

/** Definition of AWS::DataZone::Environment Resource Type */
export type AwsDatazoneEnvironment = {
  /**
   * The AWS account in which the Amazon DataZone environment is created.
   * @pattern ^\d{12}$
   */
  AwsAccountId?: string;
  /**
   * The AWS region in which the Amazon DataZone environment is created.
   * @pattern ^[a-z]{2}-[a-z]{4,10}-\d$
   */
  AwsAccountRegion?: string;
  /**
   * The AWS account in which the Amazon DataZone environment is created.
   * @pattern ^\d{12}$
   */
  EnvironmentAccountIdentifier?: string;
  /**
   * The AWS region in which the Amazon DataZone environment is created.
   * @pattern ^[a-z]{2}-[a-z]{4,10}-\d$
   */
  EnvironmentAccountRegion?: string;
  /** The timestamp of when the environment was created. */
  CreatedAt?: string;
  /** The Amazon DataZone user who created the environment. */
  CreatedBy?: string;
  /**
   * The description of the Amazon DataZone environment.
   * @maxLength 2048
   */
  Description?: string;
  /**
   * The identifier of the Amazon DataZone domain in which the environment is created.
   * @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  DomainId?: string;
  /**
   * The identifier of the Amazon DataZone domain in which the environment would be created.
   * @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  DomainIdentifier: string;
  /**
   * The ID of the blueprint with which the Amazon DataZone environment was created.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  EnvironmentBlueprintId?: string;
  /**
   * The ID of the environment profile with which the Amazon DataZone environment was created.
   * @pattern ^[a-zA-Z0-9_-]{0,36}$
   */
  EnvironmentProfileId?: string;
  /**
   * The ID of the environment profile with which the Amazon DataZone environment would be created.
   * @pattern ^[a-zA-Z0-9_-]{0,36}$
   */
  EnvironmentProfileIdentifier?: string;
  /**
   * The glossary terms that can be used in the Amazon DataZone environment.
   * @minItems 1
   * @maxItems 20
   */
  GlossaryTerms?: string[];
  /** Environment role arn for custom aws environment permissions */
  EnvironmentRoleArn?: string;
  /**
   * The ID of the Amazon DataZone environment.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  Id?: string;
  /**
   * The name of the environment.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[\w -]+$
   */
  Name: string;
  /**
   * The ID of the Amazon DataZone project in which the environment is created.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  ProjectId?: string;
  /**
   * The ID of the Amazon DataZone project in which the environment would be created.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  ProjectIdentifier: string;
  /** The provider of the Amazon DataZone environment. */
  Provider?: string;
  /** The status of the Amazon DataZone environment. */
  Status?: "ACTIVE" | "CREATING" | "UPDATING" | "DELETING" | "CREATE_FAILED" | "UPDATE_FAILED" | "DELETE_FAILED" | "VALIDATION_FAILED" | "SUSPENDED" | "DISABLED" | "EXPIRED" | "DELETED" | "INACCESSIBLE";
  /** The timestamp of when the environment was updated. */
  UpdatedAt?: string;
  /** The user parameters of the Amazon DataZone environment. */
  UserParameters?: {
    /** The name of an environment parameter. */
    Name?: string;
    /** The value of an environment parameter. */
    Value?: string;
  }[];
};
