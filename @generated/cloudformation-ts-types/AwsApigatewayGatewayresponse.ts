// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-gatewayresponse.json

/**
 * The ``AWS::ApiGateway::GatewayResponse`` resource creates a gateway response for your API. When you
 * delete a stack containing this resource, your custom gateway responses are reset. For more
 * information, see [API Gateway
 * Responses](https://docs.aws.amazon.com/apigateway/latest/developerguide/customize-gateway-responses.html#api-gateway-gatewayResponse-definition)
 * in the *API Gateway Developer Guide*.
 */
export type AwsApigatewayGatewayresponse = {
  Id?: string;
  RestApiId: string;
  ResponseType: string;
  StatusCode?: string;
  ResponseParameters?: Record<string, string>;
  ResponseTemplates?: Record<string, string>;
};
