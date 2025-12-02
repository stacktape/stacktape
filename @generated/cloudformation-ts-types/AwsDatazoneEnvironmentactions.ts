// This file is auto-generated. Do not edit manually.
// Source: aws-datazone-environmentactions.json

/** Definition of AWS::DataZone::EnvironmentActions Resource Type */
export type AwsDatazoneEnvironmentactions = {
  /**
   * The description of the Amazon DataZone environment action.
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
  DomainIdentifier?: string;
  /**
   * The identifier of the Amazon DataZone environment in which the action is taking place
   * @minLength 1
   * @maxLength 36
   * @pattern [a-zA-Z0-9_-]{1,36}$
   */
  EnvironmentId?: string;
  /**
   * The identifier of the Amazon DataZone environment in which the action is taking place
   * @minLength 1
   * @maxLength 36
   * @pattern [a-zA-Z0-9_-]{1,36}$
   */
  EnvironmentIdentifier?: string;
  /**
   * The ID of the Amazon DataZone environment action.
   * @minLength 1
   * @maxLength 36
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  Id?: string;
  /**
   * The ID of the Amazon DataZone environment action.
   * @minLength 1
   * @maxLength 36
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  Identifier?: string;
  /**
   * The name of the environment action.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[\w -]+$
   */
  Name: string;
  /** The parameters of the environment action. */
  Parameters?: {
    Uri?: string;
  };
};
