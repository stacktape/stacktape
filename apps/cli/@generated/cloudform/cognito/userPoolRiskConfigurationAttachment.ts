import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AccountTakeoverActionType {
  Notify!: Value<boolean>;
  EventAction!: Value<string>;
  constructor(properties: AccountTakeoverActionType) {
    Object.assign(this, properties);
  }
}

export class AccountTakeoverActionsType {
  HighAction?: AccountTakeoverActionType;
  LowAction?: AccountTakeoverActionType;
  MediumAction?: AccountTakeoverActionType;
  constructor(properties: AccountTakeoverActionsType) {
    Object.assign(this, properties);
  }
}

export class AccountTakeoverRiskConfigurationType {
  Actions!: AccountTakeoverActionsType;
  NotifyConfiguration?: NotifyConfigurationType;
  constructor(properties: AccountTakeoverRiskConfigurationType) {
    Object.assign(this, properties);
  }
}

export class CompromisedCredentialsActionsType {
  EventAction!: Value<string>;
  constructor(properties: CompromisedCredentialsActionsType) {
    Object.assign(this, properties);
  }
}

export class CompromisedCredentialsRiskConfigurationType {
  Actions!: CompromisedCredentialsActionsType;
  EventFilter?: List<Value<string>>;
  constructor(properties: CompromisedCredentialsRiskConfigurationType) {
    Object.assign(this, properties);
  }
}

export class NotifyConfigurationType {
  BlockEmail?: NotifyEmailType;
  ReplyTo?: Value<string>;
  SourceArn!: Value<string>;
  NoActionEmail?: NotifyEmailType;
  From?: Value<string>;
  MfaEmail?: NotifyEmailType;
  constructor(properties: NotifyConfigurationType) {
    Object.assign(this, properties);
  }
}

export class NotifyEmailType {
  TextBody?: Value<string>;
  HtmlBody?: Value<string>;
  Subject!: Value<string>;
  constructor(properties: NotifyEmailType) {
    Object.assign(this, properties);
  }
}

export class RiskExceptionConfigurationType {
  BlockedIPRangeList?: List<Value<string>>;
  SkippedIPRangeList?: List<Value<string>>;
  constructor(properties: RiskExceptionConfigurationType) {
    Object.assign(this, properties);
  }
}
export interface UserPoolRiskConfigurationAttachmentProperties {
  CompromisedCredentialsRiskConfiguration?: CompromisedCredentialsRiskConfigurationType;
  UserPoolId: Value<string>;
  ClientId: Value<string>;
  AccountTakeoverRiskConfiguration?: AccountTakeoverRiskConfigurationType;
  RiskExceptionConfiguration?: RiskExceptionConfigurationType;
}
export default class UserPoolRiskConfigurationAttachment extends ResourceBase<UserPoolRiskConfigurationAttachmentProperties> {
  static AccountTakeoverActionType = AccountTakeoverActionType;
  static AccountTakeoverActionsType = AccountTakeoverActionsType;
  static AccountTakeoverRiskConfigurationType = AccountTakeoverRiskConfigurationType;
  static CompromisedCredentialsActionsType = CompromisedCredentialsActionsType;
  static CompromisedCredentialsRiskConfigurationType = CompromisedCredentialsRiskConfigurationType;
  static NotifyConfigurationType = NotifyConfigurationType;
  static NotifyEmailType = NotifyEmailType;
  static RiskExceptionConfigurationType = RiskExceptionConfigurationType;
  constructor(properties: UserPoolRiskConfigurationAttachmentProperties) {
    super('AWS::Cognito::UserPoolRiskConfigurationAttachment', properties);
  }
}
