// This file is auto-generated. Do not edit manually.
// Source: aws-apigatewayv2-apigatewaymanagedoverrides.json

/** Resource Type definition for AWS::ApiGatewayV2::ApiGatewayManagedOverrides */
export type AwsApigatewayv2Apigatewaymanagedoverrides = {
  Stage?: {
    Description?: string;
    AccessLogSettings?: {
      DestinationArn?: string;
      Format?: string;
    };
    AutoDeploy?: boolean;
    RouteSettings?: Record<string, unknown>;
    StageVariables?: Record<string, unknown>;
    DefaultRouteSettings?: {
      DetailedMetricsEnabled?: boolean;
      LoggingLevel?: string;
      DataTraceEnabled?: boolean;
      ThrottlingBurstLimit?: number;
      ThrottlingRateLimit?: number;
    };
  };
  Integration?: {
    TimeoutInMillis?: number;
    Description?: string;
    PayloadFormatVersion?: string;
    IntegrationMethod?: string;
  };
  Id?: string;
  ApiId: string;
  Route?: {
    /** @uniqueItems false */
    AuthorizationScopes?: string[];
    Target?: string;
    AuthorizationType?: string;
    AuthorizerId?: string;
    OperationName?: string;
  };
};
