// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-model.json

/**
 * The ``AWS::ApiGateway::Model`` resource defines the structure of a request or response payload for
 * an API method.
 */
export type AwsApigatewayModel = {
  ContentType?: string;
  Description?: string;
  /**
   * A name for the model. If you don't specify a name, CFN generates a unique physical ID and uses that
   * ID for the model name. For more information, see [Name
   * Type](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-name.html).
   * If you specify a name, you cannot perform updates that require replacement of this resource. You
   * can perform updates that require no or some interruption. If you must replace the resource, specify
   * a new name.
   */
  Name?: string;
  RestApiId: string;
  Schema?: Record<string, unknown> | string;
};
