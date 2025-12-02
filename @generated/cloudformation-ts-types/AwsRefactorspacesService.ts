// This file is auto-generated. Do not edit manually.
// Source: aws-refactorspaces-service.json

/** Definition of AWS::RefactorSpaces::Service Resource Type */
export type AwsRefactorspacesService = {
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:(aws[a-zA-Z-]*)?:refactor-spaces:[a-zA-Z0-9\-]+:\w{12}:[a-zA-Z_0-9+=,.@\-_/]+$
   */
  Arn?: string;
  /**
   * @minLength 14
   * @maxLength 14
   * @pattern ^app-([0-9A-Za-z]{10}$)
   */
  ApplicationIdentifier: string;
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9-_\s\.\!\*\#\@\']+$
   */
  Description?: string;
  EndpointType: "LAMBDA" | "URL";
  /**
   * @minLength 14
   * @maxLength 14
   * @pattern ^env-([0-9A-Za-z]{10}$)
   */
  EnvironmentIdentifier: string;
  LambdaEndpoint?: {
    /**
     * @minLength 1
     * @maxLength 2048
     * @pattern ^arn:(aws[a-zA-Z-]*)?:lambda:[a-z]{2}((-gov)|(-iso(b?)))?-[a-z]+-\d{1}:\d{12}:function:[a-zA-Z0-9-_]+(:(\$LATEST|[a-zA-Z0-9-_]+))?$
     */
    Arn: string;
  };
  /**
   * @minLength 3
   * @maxLength 63
   * @pattern ^(?!svc-)[a-zA-Z0-9]+[a-zA-Z0-9-_ ]+$
   */
  Name: string;
  /**
   * @minLength 14
   * @maxLength 14
   * @pattern ^svc-([0-9A-Za-z]{10}$)
   */
  ServiceIdentifier?: string;
  UrlEndpoint?: {
    /**
     * @minLength 1
     * @maxLength 2048
     * @pattern ^https?://[-a-zA-Z0-9+\x38@#/%?=~_|!:,.;]*[-a-zA-Z0-9+\x38@#/%=~_|]$
     */
    HealthUrl?: string;
    /**
     * @minLength 1
     * @maxLength 2048
     * @pattern ^https?://[-a-zA-Z0-9+\x38@#/%?=~_|!:,.;]*[-a-zA-Z0-9+\x38@#/%=~_|]$
     */
    Url: string;
  };
  /**
   * @minLength 12
   * @maxLength 21
   * @pattern ^vpc-[-a-f0-9]{8}([-a-f0-9]{9})?$
   */
  VpcId?: string;
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
