// This file is auto-generated. Do not edit manually.
// Source: aws-apigatewayv2-routeresponse.json

/**
 * The ``AWS::ApiGatewayV2::RouteResponse`` resource creates a route response for a WebSocket API. For
 * more information, see [Set up Route Responses for a WebSocket API in API
 * Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-route-response.html)
 * in the *API Gateway Developer Guide*.
 */
export type AwsApigatewayv2Routeresponse = {
  /** The route response key. */
  RouteResponseKey: string;
  /** The route response parameters. */
  ResponseParameters?: unknown;
  /** The route ID. */
  RouteId: string;
  /** The model selection expression for the route response. Supported only for WebSocket APIs. */
  ModelSelectionExpression?: string;
  /** The API identifier. */
  ApiId: string;
  /** The response models for the route response. */
  ResponseModels?: Record<string, unknown>;
  RouteResponseId?: string;
};
