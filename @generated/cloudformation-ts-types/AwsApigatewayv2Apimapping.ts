// This file is auto-generated. Do not edit manually.
// Source: aws-apigatewayv2-apimapping.json

/**
 * The ``AWS::ApiGatewayV2::ApiMapping`` resource contains an API mapping. An API mapping relates a
 * path of your custom domain name to a stage of your API. A custom domain name can have multiple API
 * mappings, but the paths can't overlap. A custom domain can map only to APIs of the same protocol
 * type. For more information, see
 * [CreateApiMapping](https://docs.aws.amazon.com/apigatewayv2/latest/api-reference/domainnames-domainname-apimappings.html#CreateApiMapping)
 * in the *Amazon API Gateway V2 API Reference*.
 */
export type AwsApigatewayv2Apimapping = {
  ApiMappingId?: string;
  /** The domain name. */
  DomainName: string;
  /** The API stage. */
  Stage: string;
  /** The API mapping key. */
  ApiMappingKey?: string;
  /** The identifier of the API. */
  ApiId: string;
};
