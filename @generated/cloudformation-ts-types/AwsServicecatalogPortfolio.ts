// This file is auto-generated. Do not edit manually.
// Source: aws-servicecatalog-portfolio.json

/** Resource Type definition for AWS::ServiceCatalog::Portfolio */
export type AwsServicecatalogPortfolio = {
  Id?: string;
  PortfolioName?: string;
  ProviderName: string;
  Description?: string;
  DisplayName: string;
  AcceptLanguage?: string;
  /** @uniqueItems false */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
