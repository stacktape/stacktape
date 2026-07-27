// This file is auto-generated. Do not edit manually.
// Source: aws-cognito-userpooldomain.json

/** Resource Type definition for AWS::Cognito::UserPoolDomain */
export type AwsCognitoUserpooldomain = {
  UserPoolId: string;
  Domain: string;
  CustomDomainConfig?: {
    CertificateArn?: string;
  };
  CloudFrontDistribution?: string;
  ManagedLoginVersion?: number;
};
