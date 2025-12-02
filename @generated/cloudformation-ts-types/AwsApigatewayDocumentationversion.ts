// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-documentationversion.json

/**
 * The ``AWS::ApiGateway::DocumentationVersion`` resource creates a snapshot of the documentation for
 * an API. For more information, see [Representation of API Documentation in API
 * Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-documenting-api-content-representation.html)
 * in the *API Gateway Developer Guide*.
 */
export type AwsApigatewayDocumentationversion = {
  Description?: string;
  /** @minLength 1 */
  DocumentationVersion: string;
  /** @minLength 1 */
  RestApiId: string;
};
