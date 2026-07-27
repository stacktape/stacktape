// This file is auto-generated. Do not edit manually.
// Source: aws-servicecatalogappregistry-attributegroup.json

/** Resource Schema for AWS::ServiceCatalogAppRegistry::AttributeGroup. */
export type AwsServicecatalogappregistryAttributegroup = {
  /** @pattern [a-z0-9]{12} */
  Id?: string;
  /** @pattern arn:aws[-a-z]*:servicecatalog:[a-z]{2}(-gov)?-[a-z]+-\d:\d{12}:/attribute-groups/[a-z0-9]+ */
  Arn?: string;
  /**
   * The name of the attribute group.
   * @minLength 1
   * @maxLength 256
   * @pattern \w+
   */
  Name: string;
  /**
   * The description of the attribute group.
   * @maxLength 1024
   */
  Description?: string;
  Attributes: Record<string, unknown>;
  Tags?: Record<string, string>;
};
