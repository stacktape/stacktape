// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-basepathmappingv2.json

/** Resource Type definition for AWS::ApiGateway::BasePathMappingV2 */
export type AwsApigatewayBasepathmappingv2 = {
  /** The base path name that callers of the API must provide in the URL after the domain name. */
  BasePath?: string;
  /** The Arn of an AWS::ApiGateway::DomainNameV2 resource. */
  DomainNameArn: string;
  /** The ID of the API. */
  RestApiId: string;
  /** The name of the API's stage. */
  Stage?: string;
  /** Amazon Resource Name (ARN) of the resource. */
  BasePathMappingArn?: string;
};
