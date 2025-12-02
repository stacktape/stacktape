// This file is auto-generated. Do not edit manually.
// Source: aws-servicecatalog-resourceupdateconstraint.json

/** Resource type definition for AWS::ServiceCatalog::ResourceUpdateConstraint */
export type AwsServicecatalogResourceupdateconstraint = {
  /** Unique identifier for the constraint */
  Id?: string;
  /** The description of the constraint */
  Description?: string;
  /** The language code */
  AcceptLanguage?: string;
  /**
   * ALLOWED or NOT_ALLOWED, to permit or prevent changes to the tags on provisioned instances of the
   * specified portfolio / product combination
   */
  TagUpdateOnProvisionedProduct: string;
  /** The portfolio identifier */
  PortfolioId: string;
  /** The product identifier */
  ProductId: string;
};
