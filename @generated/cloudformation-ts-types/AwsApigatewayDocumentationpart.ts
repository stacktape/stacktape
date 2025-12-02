// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-documentationpart.json

/**
 * The ``AWS::ApiGateway::DocumentationPart`` resource creates a documentation part for an API. For
 * more information, see [Representation of API Documentation in API
 * Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-documenting-api-content-representation.html)
 * in the *API Gateway Developer Guide*.
 */
export type AwsApigatewayDocumentationpart = {
  DocumentationPartId?: string;
  Location: {
    Method?: string;
    Name?: string;
    Path?: string;
    StatusCode?: string;
    /** @enum ["API","AUTHORIZER","MODEL","RESOURCE","METHOD","PATH_PARAMETER","QUERY_PARAMETER","REQUEST_HEADER","REQUEST_BODY","RESPONSE","RESPONSE_HEADER","RESPONSE_BODY"] */
    Type?: "API" | "AUTHORIZER" | "MODEL" | "RESOURCE" | "METHOD" | "PATH_PARAMETER" | "QUERY_PARAMETER" | "REQUEST_HEADER" | "REQUEST_BODY" | "RESPONSE" | "RESPONSE_HEADER" | "RESPONSE_BODY";
  };
  Properties: string;
  RestApiId: string;
};
