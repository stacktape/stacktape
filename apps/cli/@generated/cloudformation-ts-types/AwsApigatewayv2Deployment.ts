// This file is auto-generated. Do not edit manually.
// Source: aws-apigatewayv2-deployment.json

/** The ``AWS::ApiGatewayV2::Deployment`` resource creates a deployment for an API. */
export type AwsApigatewayv2Deployment = {
  DeploymentId?: string;
  /** The description for the deployment resource. */
  Description?: string;
  /** The name of an existing stage to associate with the deployment. */
  StageName?: string;
  /** The API identifier. */
  ApiId: string;
};
