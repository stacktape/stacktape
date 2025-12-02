// This file is auto-generated. Do not edit manually.
// Source: aws-appsync-domainnameapiassociation.json

/** Resource Type definition for AWS::AppSync::DomainNameApiAssociation */
export type AwsAppsyncDomainnameapiassociation = {
  /**
   * @minLength 1
   * @maxLength 253
   * @pattern ^(\*[a-z\d-]*\.)?([a-z\d-]+\.)+[a-z\d-]+$
   */
  DomainName: string;
  ApiId: string;
  ApiAssociationIdentifier?: string;
};
