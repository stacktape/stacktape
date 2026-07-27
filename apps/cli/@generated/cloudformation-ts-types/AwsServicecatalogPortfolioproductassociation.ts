// This file is auto-generated. Do not edit manually.
// Source: aws-servicecatalog-portfolioproductassociation.json

/** Resource Type definition for AWS::ServiceCatalog::PortfolioProductAssociation */
export type AwsServicecatalogPortfolioproductassociation = {
  /**
   * The identifier of the source portfolio. The source portfolio must be a portfolio imported from a
   * different account than the one creating the association. This account must have previously shared
   * this portfolio with the account creating the association.
   */
  SourcePortfolioId?: string;
  /** The language code. */
  AcceptLanguage?: string;
  /** The portfolio identifier. */
  PortfolioId?: string;
  /** The product identifier. */
  ProductId?: string;
};
