// This file is auto-generated. Do not edit manually.
// Source: aws-managedblockchain-accessor.json

/** Definition of AWS::ManagedBlockchain::com.amazonaws.taiga.webservice.api#Accessor Resource Type */
export type AwsManagedblockchainAccessor = {
  /**
   * @minLength 1
   * @maxLength 1011
   * @pattern ^arn:.+:.+:.+:.+:.+$
   */
  Arn?: string;
  /**
   * @minLength 42
   * @maxLength 42
   */
  BillingToken?: string;
  CreationDate?: string;
  /**
   * @minLength 1
   * @maxLength 32
   */
  Id?: string;
  Status?: "AVAILABLE" | "PENDING_DELETION" | "DELETED";
  AccessorType: "BILLING_TOKEN";
  NetworkType?: "ETHEREUM_GOERLI" | "ETHEREUM_MAINNET" | "ETHEREUM_MAINNET_AND_GOERLI" | "POLYGON_MAINNET" | "POLYGON_MUMBAI";
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 127
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 255
     */
    Value: string;
  }[];
};
