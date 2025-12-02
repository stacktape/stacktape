// This file is auto-generated. Do not edit manually.
// Source: aws-lex-botalias.json

/**
 * A Bot Alias enables you to change the version of a bot without updating applications that use the
 * bot
 */
export type AwsLexBotalias = {
  BotAliasId?: string;
  BotId: string;
  Arn?: string;
  BotAliasStatus?: "Creating" | "Available" | "Deleting" | "Failed";
  BotAliasLocaleSettings?: {
    /**
     * A string used to identify the locale
     * @minLength 1
     * @maxLength 128
     */
    LocaleId: string;
    BotAliasLocaleSetting: {
      CodeHookSpecification?: {
        LambdaCodeHook: {
          /**
           * The version of the request-response that you want Amazon Lex to use to invoke your Lambda function.
           * @minLength 1
           * @maxLength 5
           */
          CodeHookInterfaceVersion: string;
          /**
           * The Amazon Resource Name (ARN) of the Lambda function.
           * @minLength 20
           * @maxLength 2048
           */
          LambdaArn: string;
        };
      };
      /** Whether the Lambda code hook is enabled */
      Enabled: boolean;
    };
  }[];
  BotAliasName: string;
  BotVersion?: string;
  ConversationLogSettings?: {
    AudioLogSettings?: {
      Destination: {
        S3Bucket: {
          /**
           * The Amazon Resource Name (ARN) of an Amazon S3 bucket where audio log files are stored.
           * @minLength 1
           * @maxLength 2048
           * @pattern ^arn:[\w\-]+:s3:::[a-z0-9][\.\-a-z0-9]{1,61}[a-z0-9]$
           */
          S3BucketArn: string;
          /**
           * The Amazon S3 key of the deployment package.
           * @minLength 0
           * @maxLength 1024
           */
          LogPrefix: string;
          /**
           * The Amazon Resource Name (ARN) of an AWS Key Management Service (KMS) key for encrypting audio log
           * files stored in an S3 bucket.
           * @minLength 20
           * @maxLength 2048
           * @pattern ^arn:[\w\-]+:kms:[\w\-]+:[\d]{12}:(?:key\/[\w\-]+|alias\/[a-zA-Z0-9:\/_\-]{1,256})$
           */
          KmsKeyArn?: string;
        };
      };
      Enabled: boolean;
    }[];
    TextLogSettings?: {
      Destination: {
        CloudWatch: {
          /**
           * A string used to identify the groupArn for the Cloudwatch Log Group
           * @minLength 1
           * @maxLength 2048
           */
          CloudWatchLogGroupArn: string;
          /**
           * A string containing the value for the Log Prefix
           * @minLength 0
           * @maxLength 1024
           */
          LogPrefix: string;
        };
      };
      Enabled: boolean;
    }[];
  };
  Description?: string;
  /**
   * Determines whether Amazon Lex will use Amazon Comprehend to detect the sentiment of user
   * utterances.
   */
  SentimentAnalysisSettings?: {
    /** Enable to call Amazon Comprehend for Sentiment natively within Lex */
    DetectSentiment: boolean;
  };
  /**
   * A list of tags to add to the bot alias.
   * @maxItems 200
   * @uniqueItems true
   */
  BotAliasTags?: {
    /**
     * A string used to identify this tag
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * A string containing the value for the tag
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
