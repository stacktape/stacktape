import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AnalyticsConfiguration {
  ApplicationArn?: Value<string>;
  UserDataShared?: Value<boolean>;
  ExternalId?: Value<string>;
  ApplicationId?: Value<string>;
  RoleArn?: Value<string>;
  constructor(properties: AnalyticsConfiguration) {
    Object.assign(this, properties);
  }
}

export class RefreshTokenRotation {
  RetryGracePeriodSeconds?: Value<number>;
  Feature?: Value<string>;
  constructor(properties: RefreshTokenRotation) {
    Object.assign(this, properties);
  }
}

export class TokenValidityUnits {
  IdToken?: Value<string>;
  RefreshToken?: Value<string>;
  AccessToken?: Value<string>;
  constructor(properties: TokenValidityUnits) {
    Object.assign(this, properties);
  }
}
export interface UserPoolClientProperties {
  AnalyticsConfiguration?: AnalyticsConfiguration;
  GenerateSecret?: Value<boolean>;
  CallbackURLs?: List<Value<string>>;
  EnablePropagateAdditionalUserContextData?: Value<boolean>;
  IdTokenValidity?: Value<number>;
  AuthSessionValidity?: Value<number>;
  RefreshTokenRotation?: RefreshTokenRotation;
  AllowedOAuthScopes?: List<Value<string>>;
  TokenValidityUnits?: TokenValidityUnits;
  ReadAttributes?: List<Value<string>>;
  AllowedOAuthFlowsUserPoolClient?: Value<boolean>;
  DefaultRedirectURI?: Value<string>;
  SupportedIdentityProviders?: List<Value<string>>;
  ClientName?: Value<string>;
  UserPoolId: Value<string>;
  AllowedOAuthFlows?: List<Value<string>>;
  ExplicitAuthFlows?: List<Value<string>>;
  LogoutURLs?: List<Value<string>>;
  AccessTokenValidity?: Value<number>;
  RefreshTokenValidity?: Value<number>;
  WriteAttributes?: List<Value<string>>;
  PreventUserExistenceErrors?: Value<string>;
  EnableTokenRevocation?: Value<boolean>;
}
export default class UserPoolClient extends ResourceBase<UserPoolClientProperties> {
  static AnalyticsConfiguration = AnalyticsConfiguration;
  static RefreshTokenRotation = RefreshTokenRotation;
  static TokenValidityUnits = TokenValidityUnits;
  constructor(properties: UserPoolClientProperties) {
    super('AWS::Cognito::UserPoolClient', properties);
  }
}
