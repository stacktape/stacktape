// This file is auto-generated. Do not edit manually.
// Source: aws-refactorspaces-route.json

/** Definition of AWS::RefactorSpaces::Route Resource Type */
export type AwsRefactorspacesRoute = {
  PathResourceToId?: string;
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
   * @minLength 14
   * @maxLength 14
   * @pattern ^env-([0-9A-Za-z]{10}$)
   */
  EnvironmentIdentifier: string;
  /**
   * @minLength 14
   * @maxLength 14
   * @pattern ^rte-([0-9A-Za-z]{10}$)
   */
  RouteIdentifier?: string;
  RouteType: "DEFAULT" | "URI_PATH";
  /**
   * @minLength 14
   * @maxLength 14
   * @pattern ^svc-([0-9A-Za-z]{10}$)
   */
  ServiceIdentifier: string;
  DefaultRoute?: {
    ActivationState: "INACTIVE" | "ACTIVE";
  };
  UriPathRoute?: {
    /**
     * @minLength 1
     * @maxLength 2048
     * @pattern ^(/([a-zA-Z0-9._:-]+|\{[a-zA-Z0-9._:-]+\}))+$
     */
    SourcePath?: string;
    ActivationState: "INACTIVE" | "ACTIVE";
    Methods?: ("DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT")[];
    IncludeChildPaths?: boolean;
    AppendSourcePath?: boolean;
  };
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
