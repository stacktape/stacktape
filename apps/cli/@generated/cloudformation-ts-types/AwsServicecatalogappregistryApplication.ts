// This file is auto-generated. Do not edit manually.
// Source: aws-servicecatalogappregistry-application.json

/** Resource Schema for AWS::ServiceCatalogAppRegistry::Application */
export type AwsServicecatalogappregistryApplication = {
  /** @pattern [a-z0-9]{26} */
  Id?: string;
  /** @pattern arn:aws[-a-z]*:servicecatalog:[a-z]{2}(-gov)?-[a-z]+-\d:\d{12}:/applications/[a-z0-9]+ */
  Arn?: string;
  /**
   * The name of the application.
   * @minLength 1
   * @maxLength 256
   * @pattern \w+
   */
  Name: string;
  /**
   * The description of the application.
   * @maxLength 1024
   */
  Description?: string;
  Tags?: Record<string, string>;
  /**
   * The key of the AWS application tag, which is awsApplication. Applications created before 11/13/2023
   * or applications without the AWS application tag resource group return no value.
   * @maxLength 128
   * @pattern \w+
   */
  ApplicationTagKey?: string;
  /**
   * The value of the AWS application tag, which is the identifier of an associated resource.
   * Applications created before 11/13/2023 or applications without the AWS application tag resource
   * group return no value.
   * @maxLength 256
   * @pattern \[a-zA-Z0-9_-:/]+
   */
  ApplicationTagValue?: string;
  /**
   * The name of the application.
   * @minLength 1
   * @maxLength 256
   * @pattern \w+
   */
  ApplicationName?: string;
};
