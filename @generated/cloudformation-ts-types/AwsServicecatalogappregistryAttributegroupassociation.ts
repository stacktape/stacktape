// This file is auto-generated. Do not edit manually.
// Source: aws-servicecatalogappregistry-attributegroupassociation.json

/** Resource Schema for AWS::ServiceCatalogAppRegistry::AttributeGroupAssociation. */
export type AwsServicecatalogappregistryAttributegroupassociation = {
  /**
   * The name or the Id of the Application.
   * @minLength 1
   * @maxLength 256
   * @pattern \w+|[a-z0-9]{12}
   */
  Application: string;
  /**
   * The name or the Id of the AttributeGroup.
   * @minLength 1
   * @maxLength 256
   * @pattern \w+|[a-z0-9]{12}
   */
  AttributeGroup: string;
  /** @pattern arn:aws[-a-z]*:servicecatalog:[a-z]{2}(-gov)?-[a-z]+-\d:\d{12}:/applications/[a-z0-9]+ */
  ApplicationArn?: string;
  /** @pattern arn:aws[-a-z]*:servicecatalog:[a-z]{2}(-gov)?-[a-z]+-\d:\d{12}:/attribute-groups/[a-z0-9]+ */
  AttributeGroupArn?: string;
};
