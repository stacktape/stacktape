// This file is auto-generated. Do not edit manually.
// Source: aws-cognito-userpooluser.json

/** Resource Type definition for AWS::Cognito::UserPoolUser */
export type AwsCognitoUserpooluser = {
  DesiredDeliveryMediums?: string[];
  ForceAliasCreation?: boolean;
  UserAttributes?: {
    Name?: string;
    Value?: string;
  }[];
  MessageAction?: string;
  Username?: string;
  UserPoolId: string;
  ValidationData?: {
    Name?: string;
    Value?: string;
  }[];
  ClientMetadata?: Record<string, string>;
};
