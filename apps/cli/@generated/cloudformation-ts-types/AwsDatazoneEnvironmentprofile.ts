// This file is auto-generated. Do not edit manually.
// Source: aws-datazone-environmentprofile.json

/**
 * AWS Datazone Environment Profile is pre-configured set of resources and blueprints that provide
 * reusable templates for creating environments.
 */
export type AwsDatazoneEnvironmentprofile = {
  /**
   * The AWS account in which the Amazon DataZone environment is created.
   * @pattern ^\d{12}$
   */
  AwsAccountId: string;
  /**
   * The AWS region in which this environment profile is created.
   * @pattern ^[a-z]{2}-[a-z]{4,10}-\d$
   */
  AwsAccountRegion: string;
  /** The timestamp of when this environment profile was created. */
  CreatedAt?: string;
  /** The Amazon DataZone user who created this environment profile. */
  CreatedBy?: string;
  /**
   * The description of this Amazon DataZone environment profile.
   * @maxLength 2048
   */
  Description?: string;
  /**
   * The ID of the Amazon DataZone domain in which this environment profile is created.
   * @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  DomainId?: string;
  /**
   * The ID of the Amazon DataZone domain in which this environment profile is created.
   * @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  DomainIdentifier: string;
  /**
   * The ID of the blueprint with which this environment profile is created.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  EnvironmentBlueprintId?: string;
  /**
   * The ID of the blueprint with which this environment profile is created.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  EnvironmentBlueprintIdentifier: string;
  /**
   * The ID of this Amazon DataZone environment profile.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  Id?: string;
  /**
   * The name of this Amazon DataZone environment profile.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[\w -]+$
   */
  Name: string;
  /**
   * The identifier of the project in which to create the environment profile.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  ProjectId?: string;
  /**
   * The identifier of the project in which to create the environment profile.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  ProjectIdentifier: string;
  /** The timestamp of when this environment profile was updated. */
  UpdatedAt?: string;
  /** The user parameters of this Amazon DataZone environment profile. */
  UserParameters?: {
    /** The name of an environment profile parameter. */
    Name?: string;
    /** The value of an environment profile parameter. */
    Value?: string;
  }[];
};
