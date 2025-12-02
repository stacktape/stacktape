import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AccountRecoverySetting {
  RecoveryMechanisms?: List<RecoveryOption>;
  constructor(properties: AccountRecoverySetting) {
    Object.assign(this, properties);
  }
}

export class AdminCreateUserConfig {
  InviteMessageTemplate?: InviteMessageTemplate;
  UnusedAccountValidityDays?: Value<number>;
  AllowAdminCreateUserOnly?: Value<boolean>;
  constructor(properties: AdminCreateUserConfig) {
    Object.assign(this, properties);
  }
}

export class AdvancedSecurityAdditionalFlows {
  CustomAuthMode?: Value<string>;
  constructor(properties: AdvancedSecurityAdditionalFlows) {
    Object.assign(this, properties);
  }
}

export class CustomEmailSender {
  LambdaArn?: Value<string>;
  LambdaVersion?: Value<string>;
  constructor(properties: CustomEmailSender) {
    Object.assign(this, properties);
  }
}

export class CustomSMSSender {
  LambdaArn?: Value<string>;
  LambdaVersion?: Value<string>;
  constructor(properties: CustomSMSSender) {
    Object.assign(this, properties);
  }
}

export class DeviceConfiguration {
  DeviceOnlyRememberedOnUserPrompt?: Value<boolean>;
  ChallengeRequiredOnNewDevice?: Value<boolean>;
  constructor(properties: DeviceConfiguration) {
    Object.assign(this, properties);
  }
}

export class EmailConfiguration {
  ReplyToEmailAddress?: Value<string>;
  ConfigurationSet?: Value<string>;
  EmailSendingAccount?: Value<string>;
  SourceArn?: Value<string>;
  From?: Value<string>;
  constructor(properties: EmailConfiguration) {
    Object.assign(this, properties);
  }
}

export class InviteMessageTemplate {
  EmailMessage?: Value<string>;
  SMSMessage?: Value<string>;
  EmailSubject?: Value<string>;
  constructor(properties: InviteMessageTemplate) {
    Object.assign(this, properties);
  }
}

export class LambdaConfig {
  CreateAuthChallenge?: Value<string>;
  PreSignUp?: Value<string>;
  KMSKeyID?: Value<string>;
  UserMigration?: Value<string>;
  PostAuthentication?: Value<string>;
  VerifyAuthChallengeResponse?: Value<string>;
  PreAuthentication?: Value<string>;
  DefineAuthChallenge?: Value<string>;
  PreTokenGeneration?: Value<string>;
  CustomSMSSender?: CustomSMSSender;
  PostConfirmation?: Value<string>;
  CustomMessage?: Value<string>;
  PreTokenGenerationConfig?: PreTokenGenerationConfig;
  CustomEmailSender?: CustomEmailSender;
  constructor(properties: LambdaConfig) {
    Object.assign(this, properties);
  }
}

export class NumberAttributeConstraints {
  MinValue?: Value<string>;
  MaxValue?: Value<string>;
  constructor(properties: NumberAttributeConstraints) {
    Object.assign(this, properties);
  }
}

export class PasswordPolicy {
  RequireNumbers?: Value<boolean>;
  MinimumLength?: Value<number>;
  TemporaryPasswordValidityDays?: Value<number>;
  RequireUppercase?: Value<boolean>;
  RequireLowercase?: Value<boolean>;
  RequireSymbols?: Value<boolean>;
  PasswordHistorySize?: Value<number>;
  constructor(properties: PasswordPolicy) {
    Object.assign(this, properties);
  }
}

export class Policies {
  PasswordPolicy?: PasswordPolicy;
  SignInPolicy?: SignInPolicy;
  constructor(properties: Policies) {
    Object.assign(this, properties);
  }
}

export class PreTokenGenerationConfig {
  LambdaArn?: Value<string>;
  LambdaVersion?: Value<string>;
  constructor(properties: PreTokenGenerationConfig) {
    Object.assign(this, properties);
  }
}

export class RecoveryOption {
  Priority?: Value<number>;
  Name?: Value<string>;
  constructor(properties: RecoveryOption) {
    Object.assign(this, properties);
  }
}

export class SchemaAttribute {
  DeveloperOnlyAttribute?: Value<boolean>;
  Mutable?: Value<boolean>;
  AttributeDataType?: Value<string>;
  StringAttributeConstraints?: StringAttributeConstraints;
  Required?: Value<boolean>;
  NumberAttributeConstraints?: NumberAttributeConstraints;
  Name?: Value<string>;
  constructor(properties: SchemaAttribute) {
    Object.assign(this, properties);
  }
}

export class SignInPolicy {
  AllowedFirstAuthFactors?: List<Value<string>>;
  constructor(properties: SignInPolicy) {
    Object.assign(this, properties);
  }
}

export class SmsConfiguration {
  SnsRegion?: Value<string>;
  ExternalId?: Value<string>;
  SnsCallerArn?: Value<string>;
  constructor(properties: SmsConfiguration) {
    Object.assign(this, properties);
  }
}

export class StringAttributeConstraints {
  MinLength?: Value<string>;
  MaxLength?: Value<string>;
  constructor(properties: StringAttributeConstraints) {
    Object.assign(this, properties);
  }
}

export class UserAttributeUpdateSettings {
  AttributesRequireVerificationBeforeUpdate!: List<Value<string>>;
  constructor(properties: UserAttributeUpdateSettings) {
    Object.assign(this, properties);
  }
}

export class UserPoolAddOns {
  AdvancedSecurityAdditionalFlows?: AdvancedSecurityAdditionalFlows;
  AdvancedSecurityMode?: Value<string>;
  constructor(properties: UserPoolAddOns) {
    Object.assign(this, properties);
  }
}

export class UsernameConfiguration {
  CaseSensitive?: Value<boolean>;
  constructor(properties: UsernameConfiguration) {
    Object.assign(this, properties);
  }
}

export class VerificationMessageTemplate {
  EmailMessageByLink?: Value<string>;
  EmailMessage?: Value<string>;
  SmsMessage?: Value<string>;
  EmailSubject?: Value<string>;
  DefaultEmailOption?: Value<string>;
  EmailSubjectByLink?: Value<string>;
  constructor(properties: VerificationMessageTemplate) {
    Object.assign(this, properties);
  }
}
export interface UserPoolProperties {
  UserPoolTags?: { [key: string]: Value<string> };
  Policies?: Policies;
  Schema?: List<SchemaAttribute>;
  AdminCreateUserConfig?: AdminCreateUserConfig;
  UserPoolTier?: Value<string>;
  UsernameConfiguration?: UsernameConfiguration;
  UserPoolName?: Value<string>;
  SmsVerificationMessage?: Value<string>;
  UserAttributeUpdateSettings?: UserAttributeUpdateSettings;
  EmailConfiguration?: EmailConfiguration;
  SmsConfiguration?: SmsConfiguration;
  EmailVerificationSubject?: Value<string>;
  WebAuthnRelyingPartyID?: Value<string>;
  EmailAuthenticationSubject?: Value<string>;
  AccountRecoverySetting?: AccountRecoverySetting;
  VerificationMessageTemplate?: VerificationMessageTemplate;
  MfaConfiguration?: Value<string>;
  DeletionProtection?: Value<string>;
  SmsAuthenticationMessage?: Value<string>;
  WebAuthnUserVerification?: Value<string>;
  UserPoolAddOns?: UserPoolAddOns;
  EmailAuthenticationMessage?: Value<string>;
  AliasAttributes?: List<Value<string>>;
  EnabledMfas?: List<Value<string>>;
  LambdaConfig?: LambdaConfig;
  UsernameAttributes?: List<Value<string>>;
  AutoVerifiedAttributes?: List<Value<string>>;
  DeviceConfiguration?: DeviceConfiguration;
  EmailVerificationMessage?: Value<string>;
}
export default class UserPool extends ResourceBase<UserPoolProperties> {
  static AccountRecoverySetting = AccountRecoverySetting;
  static AdminCreateUserConfig = AdminCreateUserConfig;
  static AdvancedSecurityAdditionalFlows = AdvancedSecurityAdditionalFlows;
  static CustomEmailSender = CustomEmailSender;
  static CustomSMSSender = CustomSMSSender;
  static DeviceConfiguration = DeviceConfiguration;
  static EmailConfiguration = EmailConfiguration;
  static InviteMessageTemplate = InviteMessageTemplate;
  static LambdaConfig = LambdaConfig;
  static NumberAttributeConstraints = NumberAttributeConstraints;
  static PasswordPolicy = PasswordPolicy;
  static Policies = Policies;
  static PreTokenGenerationConfig = PreTokenGenerationConfig;
  static RecoveryOption = RecoveryOption;
  static SchemaAttribute = SchemaAttribute;
  static SignInPolicy = SignInPolicy;
  static SmsConfiguration = SmsConfiguration;
  static StringAttributeConstraints = StringAttributeConstraints;
  static UserAttributeUpdateSettings = UserAttributeUpdateSettings;
  static UserPoolAddOns = UserPoolAddOns;
  static UsernameConfiguration = UsernameConfiguration;
  static VerificationMessageTemplate = VerificationMessageTemplate;
  constructor(properties?: UserPoolProperties) {
    super('AWS::Cognito::UserPool', properties || {});
  }
}
