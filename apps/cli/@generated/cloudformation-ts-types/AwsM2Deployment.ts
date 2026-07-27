// This file is auto-generated. Do not edit manually.
// Source: aws-m2-deployment.json

/**
 * Represents a deployment resource of an AWS Mainframe Modernization (M2) application to a specified
 * environment
 */
export type AwsM2Deployment = {
  /**
   * The environment ID.
   * @pattern ^\S{1,80}$
   */
  EnvironmentId: string;
  /**
   * The application ID.
   * @pattern ^\S{1,80}$
   */
  ApplicationId: string;
  /** The version number of the application to deploy */
  ApplicationVersion: number;
  /**
   * The deployment ID.
   * @pattern ^\S{1,80}$
   */
  DeploymentId?: string;
  /** The status of the deployment. */
  Status?: string;
};
