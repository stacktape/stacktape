// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-requestvalidator.json

/**
 * The ``AWS::ApiGateway::RequestValidator`` resource sets up basic validation rules for incoming
 * requests to your API. For more information, see [Enable Basic Request Validation for an API in API
 * Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-request-validation.html)
 * in the *API Gateway Developer Guide*.
 */
export type AwsApigatewayRequestvalidator = {
  RequestValidatorId?: string;
  Name?: string;
  RestApiId: string;
  ValidateRequestBody?: boolean;
  ValidateRequestParameters?: boolean;
};
