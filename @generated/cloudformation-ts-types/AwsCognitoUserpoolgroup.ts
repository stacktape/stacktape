// This file is auto-generated. Do not edit manually.
// Source: aws-cognito-userpoolgroup.json

/** Resource Type definition for AWS::Cognito::UserPoolGroup */
export type AwsCognitoUserpoolgroup = {
  /** @maxLength 2048 */
  Description?: string;
  GroupName?: string;
  /** @minimum 0 */
  Precedence?: number;
  RoleArn?: string;
  UserPoolId: string;
};
