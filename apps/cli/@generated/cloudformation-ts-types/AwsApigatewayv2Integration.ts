// This file is auto-generated. Do not edit manually.
// Source: aws-apigatewayv2-integration.json

/** An example resource schema demonstrating some basic constructs and validation rules. */
export type AwsApigatewayv2Integration = {
  /** The API identifier. */
  ApiId: string;
  /** The ID of the VPC link for a private integration. Supported only for HTTP APIs. */
  ConnectionId?: string;
  /**
   * The type of the network connection to the integration endpoint. Specify INTERNET for connections
   * through the public routable internet or VPC_LINK for private connections between API Gateway and
   * resources in a VPC. The default value is INTERNET.
   */
  ConnectionType?: string;
  /**
   * Supported only for WebSocket APIs. Specifies how to handle response payload content type
   * conversions. Supported values are CONVERT_TO_BINARY and CONVERT_TO_TEXT.
   */
  ContentHandlingStrategy?: string;
  /**
   * Specifies the credentials required for the integration, if any. For AWS integrations, three options
   * are available. To specify an IAM Role for API Gateway to assume, use the role's Amazon Resource
   * Name (ARN). To require that the caller's identity be passed through from the request, specify the
   * string arn:aws:iam::*:user/*. To use resource-based permissions on supported AWS services, don't
   * specify this parameter.
   */
  CredentialsArn?: string;
  /** The description of the integration. */
  Description?: string;
  /** Specifies the integration's HTTP method type. */
  IntegrationMethod?: string;
  /** Supported only for HTTP API AWS_PROXY integrations. Specifies the AWS service action to invoke. */
  IntegrationSubtype?: string;
  /** The integration ID. */
  IntegrationId?: string;
  /** The integration type of an integration. */
  IntegrationType: string;
  /**
   * For a Lambda integration, specify the URI of a Lambda function. For an HTTP integration, specify a
   * fully-qualified URL. For an HTTP API private integration, specify the ARN of an Application Load
   * Balancer listener, Network Load Balancer listener, or AWS Cloud Map service.
   */
  IntegrationUri?: string;
  /**
   * Specifies the pass-through behavior for incoming requests based on the Content-Type header in the
   * request, and the available mapping templates specified as the requestTemplates property on the
   * Integration resource. There are three valid values: WHEN_NO_MATCH, WHEN_NO_TEMPLATES, and NEVER.
   * Supported only for WebSocket APIs.
   */
  PassthroughBehavior?: string;
  /**
   * Specifies the format of the payload sent to an integration. Required for HTTP APIs. For HTTP APIs,
   * supported values for Lambda proxy integrations are 1.0 and 2.0 For all other integrations, 1.0 is
   * the only supported value.
   */
  PayloadFormatVersion?: string;
  /** A key-value map specifying parameters. */
  RequestParameters?: Record<string, string>;
  /**
   * A map of Velocity templates that are applied on the request payload based on the value of the
   * Content-Type header sent by the client.
   */
  RequestTemplates?: Record<string, string>;
  /**
   * Parameters that transform the HTTP response from a backend integration before returning the
   * response to clients. Supported only for HTTP APIs.
   */
  ResponseParameters?: Record<string, {
    ResponseParameters?: {
      Destination?: string;
      Source?: string;
    }[];
  }>;
  /** The template selection expression for the integration. Supported only for WebSocket APIs. */
  TemplateSelectionExpression?: string;
  /**
   * Custom timeout between 50 and 29000 milliseconds for WebSocket APIs and between 50 and 30000
   * milliseconds for HTTP APIs. The default timeout is 29 seconds for WebSocket APIs and 30 seconds for
   * HTTP APIs.
   */
  TimeoutInMillis?: number;
  /**
   * The TLS configuration for a private integration. If you specify a TLS configuration, private
   * integration traffic uses the HTTPS protocol. Supported only for HTTP APIs.
   */
  TlsConfig?: {
    ServerNameToVerify?: string;
  };
};
