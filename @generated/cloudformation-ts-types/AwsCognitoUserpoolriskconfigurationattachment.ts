// This file is auto-generated. Do not edit manually.
// Source: aws-cognito-userpoolriskconfigurationattachment.json

/** Resource Type definition for AWS::Cognito::UserPoolRiskConfigurationAttachment */
export type AwsCognitoUserpoolriskconfigurationattachment = {
  UserPoolId: string;
  ClientId: string;
  RiskExceptionConfiguration?: {
    /** @uniqueItems true */
    BlockedIPRangeList?: string[];
    /** @uniqueItems true */
    SkippedIPRangeList?: string[];
  };
  CompromisedCredentialsRiskConfiguration?: {
    Actions: {
      EventAction: string;
    };
    /** @uniqueItems true */
    EventFilter?: string[];
  };
  AccountTakeoverRiskConfiguration?: {
    Actions: {
      HighAction?: {
        EventAction: string;
        Notify: boolean;
      };
      LowAction?: {
        EventAction: string;
        Notify: boolean;
      };
      MediumAction?: {
        EventAction: string;
        Notify: boolean;
      };
    };
    NotifyConfiguration?: {
      BlockEmail?: {
        HtmlBody?: string;
        Subject: string;
        TextBody?: string;
      };
      MfaEmail?: {
        HtmlBody?: string;
        Subject: string;
        TextBody?: string;
      };
      NoActionEmail?: {
        HtmlBody?: string;
        Subject: string;
        TextBody?: string;
      };
      From?: string;
      ReplyTo?: string;
      SourceArn: string;
    };
  };
};
