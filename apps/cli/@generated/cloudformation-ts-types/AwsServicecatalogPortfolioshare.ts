// This file is auto-generated. Do not edit manually.
// Source: aws-servicecatalog-portfolioshare.json

/** Resource Type definition for AWS::ServiceCatalog::PortfolioShare */
export type AwsServicecatalogPortfolioshare = {
  /** The language code. */
  AcceptLanguage?: string;
  /** The portfolio identifier. */
  PortfolioId: string;
  /**
   * The AWS account ID.
   * @pattern ^[0-9]{12}$
   */
  AccountId: string;
  /** Enables or disables TagOptions sharing when creating the portfolio share. */
  ShareTagOptions?: boolean;
};
