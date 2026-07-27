// This file is auto-generated. Do not edit manually.
// Source: aws-servicecatalog-stacksetconstraint.json

/** Resource Type definition for AWS::ServiceCatalog::StackSetConstraint */
export type AwsServicecatalogStacksetconstraint = {
  Id?: string;
  Description: string;
  StackInstanceControl: string;
  AcceptLanguage?: string;
  PortfolioId: string;
  ProductId: string;
  /** @uniqueItems false */
  RegionList: string[];
  AdminRole: string;
  /** @uniqueItems false */
  AccountList: string[];
  ExecutionRole: string;
};
