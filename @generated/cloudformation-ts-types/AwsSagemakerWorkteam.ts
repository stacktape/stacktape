// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-workteam.json

/** Resource Type definition for AWS::SageMaker::Workteam */
export type AwsSagemakerWorkteam = {
  Description?: string;
  NotificationConfiguration?: {
    NotificationTopicArn: string;
  };
  WorkteamName?: string;
  /** @uniqueItems false */
  MemberDefinitions?: {
    CognitoMemberDefinition?: {
      CognitoUserGroup: string;
      CognitoUserPool: string;
      CognitoClientId: string;
    };
    OidcMemberDefinition?: {
      /** @uniqueItems false */
      OidcGroups: string[];
    };
  }[];
  Id?: string;
  WorkforceName?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
