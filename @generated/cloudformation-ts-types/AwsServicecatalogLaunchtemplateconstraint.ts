// This file is auto-generated. Do not edit manually.
// Source: aws-servicecatalog-launchtemplateconstraint.json

/** Resource Type definition for AWS::ServiceCatalog::LaunchTemplateConstraint */
export type AwsServicecatalogLaunchtemplateconstraint = {
  /** Unique identifier for the constraint */
  Id?: string;
  /** The description of the constraint. */
  Description?: string;
  /** The language code. */
  AcceptLanguage?: string;
  /** The portfolio identifier. */
  PortfolioId: string;
  /** The product identifier. */
  ProductId: string;
  /** A json encoded string of the template constraint rules */
  Rules: string;
};
