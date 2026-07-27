// This file is auto-generated. Do not edit manually.
// Source: aws-apigatewayv2-stage.json

/** Resource Type definition for AWS::ApiGatewayV2::Stage */
export type AwsApigatewayv2Stage = {
  DeploymentId?: string;
  Description?: string;
  AutoDeploy?: boolean;
  RouteSettings?: Record<string, unknown>;
  StageName: string;
  StageVariables?: Record<string, unknown>;
  AccessPolicyId?: string;
  ClientCertificateId?: string;
  AccessLogSettings?: {
    DestinationArn?: string;
    Format?: string;
  };
  Id?: string;
  ApiId: string;
  DefaultRouteSettings?: {
    DetailedMetricsEnabled?: boolean;
    LoggingLevel?: string;
    DataTraceEnabled?: boolean;
    ThrottlingBurstLimit?: number;
    ThrottlingRateLimit?: number;
  };
  Tags?: Record<string, unknown>;
};
