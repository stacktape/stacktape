// This file is auto-generated. Do not edit manually.
// Source: aws-cognito-userpool.json

/** Definition of AWS::Cognito::UserPool Resource Type */
export type AwsCognitoUserpool = {
  /**
   * @minLength 1
   * @maxLength 128
   */
  UserPoolName?: string;
  Policies?: {
    PasswordPolicy?: {
      MinimumLength?: number;
      RequireLowercase?: boolean;
      RequireNumbers?: boolean;
      RequireSymbols?: boolean;
      RequireUppercase?: boolean;
      TemporaryPasswordValidityDays?: number;
      PasswordHistorySize?: number;
    };
    SignInPolicy?: {
      AllowedFirstAuthFactors?: string[];
    };
  };
  AccountRecoverySetting?: {
    RecoveryMechanisms?: {
      Name?: string;
      Priority?: number;
    }[];
  };
  AdminCreateUserConfig?: {
    AllowAdminCreateUserOnly?: boolean;
    InviteMessageTemplate?: {
      EmailMessage?: string;
      EmailSubject?: string;
      SMSMessage?: string;
    };
    UnusedAccountValidityDays?: number;
  };
  AliasAttributes?: string[];
  UsernameAttributes?: string[];
  AutoVerifiedAttributes?: string[];
  DeviceConfiguration?: {
    ChallengeRequiredOnNewDevice?: boolean;
    DeviceOnlyRememberedOnUserPrompt?: boolean;
  };
  EmailConfiguration?: {
    ReplyToEmailAddress?: string;
    SourceArn?: string;
    From?: string;
    ConfigurationSet?: string;
    EmailSendingAccount?: string;
  };
  /**
   * @minLength 6
   * @maxLength 20000
   */
  EmailVerificationMessage?: string;
  /**
   * @minLength 1
   * @maxLength 140
   */
  EmailVerificationSubject?: string;
  DeletionProtection?: string;
  LambdaConfig?: {
    CreateAuthChallenge?: string;
    CustomMessage?: string;
    DefineAuthChallenge?: string;
    PostAuthentication?: string;
    PostConfirmation?: string;
    PreAuthentication?: string;
    PreSignUp?: string;
    VerifyAuthChallengeResponse?: string;
    UserMigration?: string;
    PreTokenGeneration?: string;
    CustomEmailSender?: {
      LambdaVersion?: string;
      LambdaArn?: string;
    };
    CustomSMSSender?: {
      LambdaVersion?: string;
      LambdaArn?: string;
    };
    KMSKeyID?: string;
    PreTokenGenerationConfig?: {
      LambdaVersion?: string;
      LambdaArn?: string;
    };
  };
  MfaConfiguration?: string;
  EnabledMfas?: string[];
  /**
   * @minLength 6
   * @maxLength 140
   */
  SmsAuthenticationMessage?: string;
  /**
   * @minLength 6
   * @maxLength 20000
   */
  EmailAuthenticationMessage?: string;
  /**
   * @minLength 1
   * @maxLength 140
   */
  EmailAuthenticationSubject?: string;
  SmsConfiguration?: {
    ExternalId?: string;
    SnsCallerArn?: string;
    SnsRegion?: string;
  };
  /**
   * @minLength 6
   * @maxLength 140
   */
  SmsVerificationMessage?: string;
  /**
   * @minLength 1
   * @maxLength 63
   */
  WebAuthnRelyingPartyID?: string;
  /**
   * @minLength 1
   * @maxLength 9
   */
  WebAuthnUserVerification?: string;
  Schema?: {
    AttributeDataType?: string;
    DeveloperOnlyAttribute?: boolean;
    Mutable?: boolean;
    Name?: string;
    NumberAttributeConstraints?: {
      MaxValue?: string;
      MinValue?: string;
    };
    StringAttributeConstraints?: {
      MaxLength?: string;
      MinLength?: string;
    };
    Required?: boolean;
  }[];
  UsernameConfiguration?: {
    CaseSensitive?: boolean;
  };
  UserAttributeUpdateSettings?: {
    AttributesRequireVerificationBeforeUpdate: string[];
  };
  UserPoolTags?: Record<string, string>;
  VerificationMessageTemplate?: {
    DefaultEmailOption?: string;
    EmailMessage?: string;
    EmailMessageByLink?: string;
    EmailSubject?: string;
    EmailSubjectByLink?: string;
    SmsMessage?: string;
  };
  UserPoolAddOns?: {
    AdvancedSecurityMode?: string;
    AdvancedSecurityAdditionalFlows?: {
      CustomAuthMode?: string;
    };
  };
  ProviderName?: string;
  ProviderURL?: string;
  Arn?: string;
  UserPoolId?: string;
  /** @enum ["LITE","ESSENTIALS","PLUS"] */
  UserPoolTier?: "LITE" | "ESSENTIALS" | "PLUS";
};
