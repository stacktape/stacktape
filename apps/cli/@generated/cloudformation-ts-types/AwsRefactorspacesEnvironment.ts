// This file is auto-generated. Do not edit manually.
// Source: aws-refactorspaces-environment.json

/** Definition of AWS::RefactorSpaces::Environment Resource Type */
export type AwsRefactorspacesEnvironment = {
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9-_\s\.\!\*\#\@\']+$
   */
  Description?: string;
  /**
   * @minLength 14
   * @maxLength 14
   * @pattern ^env-([0-9A-Za-z]{10}$)
   */
  EnvironmentIdentifier?: string;
  /**
   * @minLength 3
   * @maxLength 63
   * @pattern ^(?!env-)[a-zA-Z0-9]+[a-zA-Z0-9-_ ]+$
   */
  Name?: string;
  NetworkFabricType?: "TRANSIT_GATEWAY" | "NONE";
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:(aws[a-zA-Z-]*)?:refactor-spaces:[a-zA-Z0-9\-]+:\w{12}:[a-zA-Z_0-9+=,.@\-_/]+$
   */
  Arn?: string;
  /**
   * @minLength 21
   * @maxLength 21
   * @pattern ^tgw-[-a-f0-9]{17}$
   */
  TransitGatewayId?: string;
  /**
   * Metadata that you can assign to help organize the frameworks that you create. Each tag is a
   * key-value pair.
   */
  Tags?: {
    /**
     * A string used to identify this tag
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:).+
     */
    Key: string;
    /**
     * A string containing the value for the tag
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
