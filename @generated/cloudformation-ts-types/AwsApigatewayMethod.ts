// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-method.json

/**
 * The ``AWS::ApiGateway::Method`` resource creates API Gateway methods that define the parameters and
 * body that clients must send in their requests.
 */
export type AwsApigatewayMethod = {
  Integration?: {
    CacheNamespace?: string;
    /** @enum ["INTERNET","VPC_LINK"] */
    ConnectionType?: "INTERNET" | "VPC_LINK";
    /** @uniqueItems true */
    IntegrationResponses?: ({
      ResponseTemplates?: Record<string, string>;
      SelectionPattern?: string;
      /** @enum ["CONVERT_TO_BINARY","CONVERT_TO_TEXT"] */
      ContentHandling?: "CONVERT_TO_BINARY" | "CONVERT_TO_TEXT";
      ResponseParameters?: Record<string, string>;
      StatusCode: string;
    })[];
    IntegrationHttpMethod?: string;
    /**
     * @default "BUFFERED"
     * @enum ["BUFFERED","STREAM"]
     */
    ResponseTransferMode?: "BUFFERED" | "STREAM";
    Uri?: string;
    /** @enum ["WHEN_NO_MATCH","WHEN_NO_TEMPLATES","NEVER"] */
    PassthroughBehavior?: "WHEN_NO_MATCH" | "WHEN_NO_TEMPLATES" | "NEVER";
    RequestParameters?: Record<string, string>;
    ConnectionId?: string;
    /** @enum ["AWS","AWS_PROXY","HTTP","HTTP_PROXY","MOCK"] */
    Type: "AWS" | "AWS_PROXY" | "HTTP" | "HTTP_PROXY" | "MOCK";
    /** @uniqueItems true */
    CacheKeyParameters?: string[];
    IntegrationTarget?: string;
    /** @enum ["CONVERT_TO_BINARY","CONVERT_TO_TEXT"] */
    ContentHandling?: "CONVERT_TO_BINARY" | "CONVERT_TO_TEXT";
    RequestTemplates?: Record<string, string>;
    /** @minimum 50 */
    TimeoutInMillis?: number;
    Credentials?: string;
  };
  OperationName?: string;
  RequestModels?: Record<string, string>;
  RestApiId: string;
  AuthorizationScopes?: string[];
  RequestValidatorId?: string;
  RequestParameters?: Record<string, boolean | string>;
  /** @uniqueItems true */
  MethodResponses?: ({
    ResponseParameters?: Record<string, boolean | string>;
    StatusCode: string;
    ResponseModels?: Record<string, string>;
  })[];
  AuthorizerId?: string;
  ResourceId: string;
  ApiKeyRequired?: boolean;
  /**
   * The method's authorization type. This parameter is required. For valid values, see
   * [Method](https://docs.aws.amazon.com/apigateway/latest/api/API_Method.html) in the *API Gateway API
   * Reference*.
   * If you specify the ``AuthorizerId`` property, specify ``CUSTOM`` or ``COGNITO_USER_POOLS`` for
   * this property.
   */
  AuthorizationType?: string;
  HttpMethod: string;
};
