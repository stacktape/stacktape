// This file is auto-generated. Do not edit manually.
// Source: aws-servicecatalog-launchnotificationconstraint.json

/** Resource Type definition for AWS::ServiceCatalog::LaunchNotificationConstraint */
export type AwsServicecatalogLaunchnotificationconstraint = {
  /** Unique identifier for the constraint */
  Id?: string;
  Description?: string;
  /** @uniqueItems false */
  NotificationArns: string[];
  AcceptLanguage?: string;
  PortfolioId: string;
  ProductId: string;
};
