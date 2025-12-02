// This file is auto-generated. Do not edit manually.
// Source: aws-servicecatalog-serviceaction.json

/** Resource Schema for AWS::ServiceCatalog::ServiceAction */
export type AwsServicecatalogServiceaction = {
  /** @enum ["en","jp","zh"] */
  AcceptLanguage?: "en" | "jp" | "zh";
  /**
   * @minLength 1
   * @maxLength 256
   */
  Name: string;
  /** @enum ["SSM_AUTOMATION"] */
  DefinitionType: "SSM_AUTOMATION";
  Definition: {
    /**
     * @minLength 1
     * @maxLength 1000
     */
    Key: string;
    /** @maxLength 4096 */
    Value: string;
  }[];
  /** @maxLength 1024 */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 100
   */
  Id?: string;
};
