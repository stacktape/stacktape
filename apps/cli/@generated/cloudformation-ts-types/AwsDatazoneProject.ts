// This file is auto-generated. Do not edit manually.
// Source: aws-datazone-project.json

/**
 * Amazon DataZone projects are business use case–based groupings of people, assets (data), and tools
 * used to simplify access to the AWS analytics.
 */
export type AwsDatazoneProject = {
  /** The timestamp of when the project was created. */
  CreatedAt?: string;
  /** The Amazon DataZone user who created the project. */
  CreatedBy?: string;
  /**
   * The description of the Amazon DataZone project.
   * @maxLength 2048
   */
  Description?: string;
  /**
   * The identifier of the Amazon DataZone domain in which the project was created.
   * @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  DomainId?: string;
  /**
   * The ID of the Amazon DataZone domain in which this project is created.
   * @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  DomainIdentifier: string;
  /**
   * The ID of the domain unit.
   * @pattern ^[a-z0-9_\-]+$
   */
  DomainUnitId?: string;
  /**
   * The glossary terms that can be used in this Amazon DataZone project.
   * @minItems 1
   * @maxItems 20
   */
  GlossaryTerms?: string[];
  /**
   * The ID of the Amazon DataZone project.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  Id?: string;
  /** The timestamp of when the project was last updated. */
  LastUpdatedAt?: string;
  /**
   * The name of the Amazon DataZone project.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[\w -]+$
   */
  Name: string;
  /**
   * The project profile ID.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  ProjectProfileId?: string;
  /**
   * The project profile version to which the project should be updated. You can only specify the
   * following string for this parameter: latest.
   */
  ProjectProfileVersion?: string;
  /** The status of the project. */
  ProjectStatus?: "ACTIVE" | "MOVING" | "DELETING" | "DELETE_FAILED" | "UPDATING" | "UPDATE_FAILED";
  /** The user parameters of the project. */
  UserParameters?: {
    /** @pattern ^[a-zA-Z0-9_-]{1,36}$ */
    EnvironmentId?: string;
    /**
     * @minLength 1
     * @maxLength 64
     * @pattern ^[\w -]+$
     */
    EnvironmentConfigurationName?: string;
    EnvironmentParameters?: {
      Name?: string;
      Value?: string;
    }[];
  }[];
};
