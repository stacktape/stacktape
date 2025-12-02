// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-account.json

/**
 * The ``AWS::ApiGateway::Account`` resource specifies the IAM role that Amazon API Gateway uses to
 * write API logs to Amazon CloudWatch Logs. To avoid overwriting other roles, you should only have
 * one ``AWS::ApiGateway::Account`` resource per region per account.
 * When you delete a stack containing this resource, API Gateway can still assume the provided IAM
 * role to write API logs to CloudWatch Logs. To deny API Gateway access to write API logs to
 * CloudWatch logs, update the permissions policies or change the IAM role to deny access.
 */
export type AwsApigatewayAccount = {
  Id?: string;
  CloudWatchRoleArn?: string;
};
