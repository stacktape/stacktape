// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-project.json

/** Resource Type definition for AWS::SageMaker::Project */
export type AwsSagemakerProject = {
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 40
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @maxLength 256
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Value: string;
  }[];
  ProjectArn?: string;
  ProjectId?: string;
  ProjectName: string;
  ProjectDescription?: string;
  /** The time at which the project was created. */
  CreationTime?: string;
  /** Input ServiceCatalog Provisioning Details */
  ServiceCatalogProvisioningDetails?: {
    ProductId: string;
    ProvisioningArtifactId?: string;
    PathId?: string;
    /** Parameters specified by the administrator that are required for provisioning the product. */
    ProvisioningParameters?: {
      /**
       * The parameter key.
       * @minLength 1
       * @maxLength 1000
       * @pattern .*
       */
      Key: string;
      /**
       * The parameter value.
       * @maxLength 4096
       * @pattern .*
       */
      Value: string;
    }[];
  };
  /** Provisioned ServiceCatalog  Details */
  ServiceCatalogProvisionedProductDetails?: {
    ProvisionedProductId?: string;
    ProvisionedProductStatusMessage?: string;
  };
  /**
   * An array of template providers associated with the project.
   * @minItems 1
   * @maxItems 1
   */
  TemplateProviderDetails?: unknown[];
  /**
   * The status of a project.
   * @enum ["Pending","CreateInProgress","CreateCompleted","CreateFailed","DeleteInProgress","DeleteFailed","DeleteCompleted"]
   */
  ProjectStatus?: "Pending" | "CreateInProgress" | "CreateCompleted" | "CreateFailed" | "DeleteInProgress" | "DeleteFailed" | "DeleteCompleted";
};
