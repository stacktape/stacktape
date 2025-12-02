// This file is auto-generated. Do not edit manually.
// Source: aws-apigatewayv2-model.json

/**
 * The ``AWS::ApiGatewayV2::Model`` resource updates data model for a WebSocket API. For more
 * information, see [Model Selection
 * Expressions](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-selection-expressions.html#apigateway-websocket-api-model-selection-expressions)
 * in the *API Gateway Developer Guide*.
 */
export type AwsApigatewayv2Model = {
  ModelId?: string;
  /** The description of the model. */
  Description?: string;
  /** The content-type for the model, for example, "application/json". */
  ContentType?: string;
  /** The schema for the model. For application/json models, this should be JSON schema draft 4 model. */
  Schema: Record<string, unknown>;
  /** The API identifier. */
  ApiId: string;
  /** The name of the model. */
  Name: string;
};
