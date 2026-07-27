// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-basepathmapping.json

/**
 * The ``AWS::ApiGateway::BasePathMapping`` resource creates a base path that clients who call your
 * API must use in the invocation URL. Supported only for public custom domain names.
 */
export type AwsApigatewayBasepathmapping = {
  BasePath?: string;
  DomainName: string;
  RestApiId?: string;
  Stage?: string;
};
