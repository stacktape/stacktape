// This file is auto-generated. Do not edit manually.
// Source: aws-servicecatalogappregistry-resourceassociation.json

/** Resource Schema for AWS::ServiceCatalogAppRegistry::ResourceAssociation */
export type AwsServicecatalogappregistryResourceassociation = {
  /**
   * The name or the Id of the Application.
   * @minLength 1
   * @maxLength 256
   * @pattern \w+|[a-z0-9]{12}
   */
  Application: string;
  /**
   * The name or the Id of the Resource.
   * @pattern \w+|arn:aws[-a-z]*:cloudformation:[a-z]{2}(-gov)?-[a-z]+-\d:\d{12}:stack/[a-zA-Z][-A-Za-z0-9]{0,127}/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}
   */
  Resource: string;
  /**
   * The type of the CFN Resource for now it's enum CFN_STACK.
   * @enum ["CFN_STACK"]
   */
  ResourceType: "CFN_STACK";
  /** @pattern arn:aws[-a-z]*:servicecatalog:[a-z]{2}(-gov)?-[a-z]+-\d:\d{12}:/applications/[a-z0-9]+ */
  ApplicationArn?: string;
  /** @pattern arn:aws[-a-z]*:cloudformation:[a-z]{2}(-gov)?-[a-z]+-\d:\d{12}:stack/[a-zA-Z][-A-Za-z0-9]{0,127}/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12} */
  ResourceArn?: string;
};
