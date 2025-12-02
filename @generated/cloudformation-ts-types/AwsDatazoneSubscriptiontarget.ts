// This file is auto-generated. Do not edit manually.
// Source: aws-datazone-subscriptiontarget.json

/** Subscription targets enables one to access the data to which you have subscribed in your projects. */
export type AwsDatazoneSubscriptiontarget = {
  /** The asset types that can be included in the subscription target. */
  ApplicableAssetTypes: string[];
  /**
   * The authorized principals of the subscription target.
   * @minItems 1
   * @maxItems 10
   */
  AuthorizedPrincipals: string[];
  /** The timestamp of when the subscription target was created. */
  CreatedAt?: string;
  /** The Amazon DataZone user who created the subscription target. */
  CreatedBy?: string;
  /**
   * The ID of the Amazon DataZone domain in which subscription target is created.
   * @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  DomainId?: string;
  /**
   * The ID of the Amazon DataZone domain in which subscription target would be created.
   * @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  DomainIdentifier: string;
  /**
   * The ID of the environment in which subscription target is created.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  EnvironmentId?: string;
  /**
   * The ID of the environment in which subscription target would be created.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  EnvironmentIdentifier: string;
  /**
   * The ID of the subscription target.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  Id?: string;
  /** The manage access role that is used to create the subscription target. */
  ManageAccessRole?: string;
  /**
   * The name of the subscription target.
   * @minLength 1
   * @maxLength 256
   */
  Name: string;
  /**
   * The identifier of the project specified in the subscription target.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  ProjectId?: string;
  /** The provider of the subscription target. */
  Provider?: string;
  /** The configuration of the subscription target. */
  SubscriptionTargetConfig: {
    /**
     * The form name included in the subscription target configuration.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?![0-9_])\w+$|^_\w*[a-zA-Z0-9]\w*$
     */
    FormName: string;
    /** The content of the subscription target configuration. */
    Content: string;
  }[];
  /** The type of the subscription target. */
  Type: string;
  /** The timestamp of when the subscription target was updated. */
  UpdatedAt?: string;
  /** The Amazon DataZone user who updated the subscription target. */
  UpdatedBy?: string;
};
