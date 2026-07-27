// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-authorizer.json

/**
 * The ``AWS::ApiGateway::Authorizer`` resource creates an authorization layer that API Gateway
 * activates for methods that have authorization enabled. API Gateway activates the authorizer when a
 * client calls those methods.
 */
export type AwsApigatewayAuthorizer = {
  RestApiId: string;
  AuthorizerId?: string;
  AuthType?: string;
  AuthorizerCredentials?: string;
  AuthorizerResultTtlInSeconds?: number;
  AuthorizerUri?: string;
  IdentitySource?: string;
  IdentityValidationExpression?: string;
  Name: string;
  /** @uniqueItems true */
  ProviderARNs?: string[];
  Type: string;
};
