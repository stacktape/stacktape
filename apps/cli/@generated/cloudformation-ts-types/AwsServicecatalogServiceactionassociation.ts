// This file is auto-generated. Do not edit manually.
// Source: aws-servicecatalog-serviceactionassociation.json

/** Resource Schema for AWS::ServiceCatalog::ServiceActionAssociation */
export type AwsServicecatalogServiceactionassociation = {
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9_-]{1,99}\Z
   */
  ProductId: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9_-]{1,99}\Z
   */
  ProvisioningArtifactId: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9_-]{1,99}\Z
   */
  ServiceActionId: string;
};
