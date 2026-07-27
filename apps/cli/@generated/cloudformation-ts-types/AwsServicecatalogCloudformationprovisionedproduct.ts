// This file is auto-generated. Do not edit manually.
// Source: aws-servicecatalog-cloudformationprovisionedproduct.json

/** Resource Schema for AWS::ServiceCatalog::CloudFormationProvisionedProduct */
export type AwsServicecatalogCloudformationprovisionedproduct = {
  /** @enum ["en","jp","zh"] */
  AcceptLanguage?: "en" | "jp" | "zh";
  /**
   * @maxItems 5
   * @uniqueItems true
   */
  NotificationArns?: string[];
  /**
   * @minLength 1
   * @maxLength 100
   */
  PathId?: string;
  /**
   * @minLength 1
   * @maxLength 100
   */
  PathName?: string;
  /**
   * @minLength 1
   * @maxLength 100
   */
  ProductId?: string;
  /**
   * @minLength 1
   * @maxLength 128
   */
  ProductName?: string;
  /**
   * @minLength 1
   * @maxLength 128
   */
  ProvisionedProductName?: string;
  /**
   * @minLength 1
   * @maxLength 100
   */
  ProvisioningArtifactId?: string;
  ProvisioningArtifactName?: string;
  ProvisioningParameters?: {
    /**
     * @minLength 1
     * @maxLength 1000
     */
    Key: string;
    /** @maxLength 4096 */
    Value: string;
  }[];
  ProvisioningPreferences?: {
    /** @uniqueItems true */
    StackSetAccounts?: string[];
    /** @minimum 0 */
    StackSetFailureToleranceCount?: number;
    /**
     * @minimum 0
     * @maximum 100
     */
    StackSetFailureTolerancePercentage?: number;
    /** @minimum 1 */
    StackSetMaxConcurrencyCount?: number;
    /**
     * @minimum 1
     * @maximum 100
     */
    StackSetMaxConcurrencyPercentage?: number;
    /** @enum ["CREATE","UPDATE","DELETE"] */
    StackSetOperationType?: "CREATE" | "UPDATE" | "DELETE";
    /** @uniqueItems true */
    StackSetRegions?: string[];
  };
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Value: string;
  }[];
  /**
   * @minLength 1
   * @maxLength 50
   */
  ProvisionedProductId?: string;
  /**
   * @minLength 1
   * @maxLength 50
   */
  RecordId?: string;
  /**
   * @minLength 1
   * @maxLength 256
   */
  CloudformationStackArn?: string;
  /** List of key-value pair outputs. */
  Outputs?: Record<string, string>;
};
