// This file is auto-generated. Do not edit manually.
// Source: aws-launchwizard-deployment.json

/** Definition of AWS::LaunchWizard::Deployment Resource Type */
export type AwsLaunchwizardDeployment = {
  /**
   * ARN of the LaunchWizard deployment
   * @pattern ^arn:aws(-cn|-us-gov)?:launchwizard:[a-z0-9-]+:[0-9]{12}:deployment/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$
   */
  Arn?: string;
  /** Timestamp of LaunchWizard deployment creation */
  CreatedAt?: string;
  /** Timestamp of LaunchWizard deployment deletion */
  DeletedAt?: string;
  /**
   * Deployment ID of the LaunchWizard deployment
   * @minLength 2
   * @maxLength 128
   * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
   */
  DeploymentId?: string;
  /**
   * Workload deployment pattern name
   * @minLength 1
   * @maxLength 256
   * @pattern ^[A-Za-z0-9][a-zA-Z0-9-]*$
   */
  DeploymentPatternName: string;
  /**
   * Name of LaunchWizard deployment
   * @minLength 1
   * @maxLength 50
   * @pattern ^[A-Za-z0-9_\s\.-]+$
   */
  Name: string;
  /** Resource Group Name created for LaunchWizard deployment */
  ResourceGroup?: string;
  /** LaunchWizard deployment specifications */
  Specifications?: Record<string, string>;
  /** Status of LaunchWizard deployment */
  Status?: "COMPLETED" | "CREATING" | "DELETE_IN_PROGRESS" | "DELETE_INITIATING" | "DELETE_FAILED" | "DELETED" | "FAILED" | "IN_PROGRESS" | "VALIDATING";
  /** Tags for LaunchWizard deployment */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
  /**
   * Workload Name for LaunchWizard deployment
   * @minLength 1
   * @maxLength 100
   * @pattern ^[A-Za-z][a-zA-Z0-9-_]*$
   */
  WorkloadName: string;
};
