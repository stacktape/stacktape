// This file is auto-generated. Do not edit manually.
// Source: aws-cognito-userpoolidentityprovider.json

/** Resource Type definition for AWS::Cognito::UserPoolIdentityProvider */
export type AwsCognitoUserpoolidentityprovider = {
  UserPoolId: string;
  ProviderName: string;
  ProviderType: string;
  ProviderDetails: Record<string, string>;
  IdpIdentifiers?: string[];
  AttributeMapping?: Record<string, string>;
};
