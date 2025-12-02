// This file is auto-generated. Do not edit manually.
// Source: aws-refactorspaces-application.json

/** Definition of AWS::RefactorSpaces::Application Resource Type */
export type AwsRefactorspacesApplication = {
  ApiGatewayProxy?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^[-a-zA-Z0-9_]*$
     */
    StageName?: string;
    EndpointType?: "REGIONAL" | "PRIVATE";
  };
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:(aws[a-zA-Z-]*)?:refactor-spaces:[a-zA-Z0-9\-]+:\w{12}:[a-zA-Z_0-9+=,.@\-_/]+$
   */
  Arn?: string;
  /**
   * @minLength 10
   * @maxLength 10
   * @pattern ^[a-z0-9]{10}$
   */
  ApiGatewayId?: string;
  /**
   * @minLength 10
   * @maxLength 10
   * @pattern ^[a-z0-9]{10}$
   */
  VpcLinkId?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:(aws[a-zA-Z-]*)?:elasticloadbalancing:[a-zA-Z0-9\\-]+:\\w{12}:[a-zA-Z_0-9+=,.@\\-_\/]+$
   */
  NlbArn?: string;
  /**
   * @minLength 1
   * @maxLength 32
   * @pattern ^(?!internal-)[a-zA-Z0-9]+[a-zA-Z0-9-_ ]+.*[^-]$
   */
  NlbName?: string;
  /**
   * @minLength 14
   * @maxLength 14
   * @pattern ^app-([0-9A-Za-z]{10}$)
   */
  ApplicationIdentifier?: string;
  /**
   * @minLength 14
   * @maxLength 14
   * @pattern ^env-([0-9A-Za-z]{10}$)
   */
  EnvironmentIdentifier: string;
  /**
   * @minLength 3
   * @maxLength 63
   * @pattern ^(?!app-)[a-zA-Z0-9]+[a-zA-Z0-9-_ ]+$
   */
  Name: string;
  ProxyType: "API_GATEWAY";
  /**
   * @minLength 12
   * @maxLength 21
   * @pattern ^vpc-[-a-f0-9]{8}([-a-f0-9]{9})?$
   */
  VpcId: string;
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern ^[-a-zA-Z0-9_]*$
   */
  StageName?: string;
  /**
   * @minLength 1
   * @maxLength 2048
   * @pattern ^http://[-a-zA-Z0-9+\x38@#/%?=~_|!:,.;]*[-a-zA-Z0-9+\x38@#/%=~_|]$
   */
  ProxyUrl?: string;
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
