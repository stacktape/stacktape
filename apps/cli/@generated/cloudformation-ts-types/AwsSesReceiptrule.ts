// This file is auto-generated. Do not edit manually.
// Source: aws-ses-receiptrule.json

/** Resource Type definition for AWS::SES::ReceiptRule */
export type AwsSesReceiptrule = {
  After?: string;
  Rule: {
    ScanEnabled?: boolean;
    /** @uniqueItems false */
    Recipients?: string[];
    /** @uniqueItems false */
    Actions?: {
      ConnectAction?: {
        InstanceARN: string;
        IAMRoleARN: string;
      };
      BounceAction?: {
        Sender: string;
        SmtpReplyCode: string;
        Message: string;
        TopicArn?: string;
        StatusCode?: string;
      };
      S3Action?: {
        ObjectKeyPrefix?: string;
        BucketName: string;
        IamRoleArn?: string;
        KmsKeyArn?: string;
        TopicArn?: string;
      };
      StopAction?: {
        Scope: string;
        TopicArn?: string;
      };
      SNSAction?: {
        TopicArn?: string;
        Encoding?: string;
      };
      WorkmailAction?: {
        TopicArn?: string;
        OrganizationArn: string;
      };
      AddHeaderAction?: {
        HeaderName: string;
        HeaderValue: string;
      };
      LambdaAction?: {
        InvocationType?: string;
        FunctionArn: string;
        TopicArn?: string;
      };
    }[];
    Enabled?: boolean;
    Name?: string;
    TlsPolicy?: string;
  };
  Id?: string;
  RuleSetName: string;
};
