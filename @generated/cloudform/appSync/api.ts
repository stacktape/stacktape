import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AuthMode {
  AuthType?: Value<string>;
  constructor(properties: AuthMode) {
    Object.assign(this, properties);
  }
}

export class AuthProvider {
  OpenIDConnectConfig?: OpenIDConnectConfig;
  CognitoConfig?: CognitoConfig;
  LambdaAuthorizerConfig?: LambdaAuthorizerConfig;
  AuthType!: Value<string>;
  constructor(properties: AuthProvider) {
    Object.assign(this, properties);
  }
}

export class CognitoConfig {
  AppIdClientRegex?: Value<string>;
  UserPoolId!: Value<string>;
  AwsRegion!: Value<string>;
  constructor(properties: CognitoConfig) {
    Object.assign(this, properties);
  }
}

export class DnsMap {
  Http?: Value<string>;
  Realtime?: Value<string>;
  constructor(properties: DnsMap) {
    Object.assign(this, properties);
  }
}

export class EventConfig {
  AuthProviders!: List<AuthProvider>;
  ConnectionAuthModes!: List<AuthMode>;
  DefaultPublishAuthModes!: List<AuthMode>;
  DefaultSubscribeAuthModes!: List<AuthMode>;
  LogConfig?: EventLogConfig;
  constructor(properties: EventConfig) {
    Object.assign(this, properties);
  }
}

export class EventLogConfig {
  CloudWatchLogsRoleArn!: Value<string>;
  LogLevel!: Value<string>;
  constructor(properties: EventLogConfig) {
    Object.assign(this, properties);
  }
}

export class LambdaAuthorizerConfig {
  IdentityValidationExpression?: Value<string>;
  AuthorizerUri!: Value<string>;
  AuthorizerResultTtlInSeconds?: Value<number>;
  constructor(properties: LambdaAuthorizerConfig) {
    Object.assign(this, properties);
  }
}

export class OpenIDConnectConfig {
  Issuer!: Value<string>;
  ClientId?: Value<string>;
  AuthTTL?: Value<number>;
  IatTTL?: Value<number>;
  constructor(properties: OpenIDConnectConfig) {
    Object.assign(this, properties);
  }
}
export interface ApiProperties {
  OwnerContact?: Value<string>;
  EventConfig?: EventConfig;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Api extends ResourceBase<ApiProperties> {
  static AuthMode = AuthMode;
  static AuthProvider = AuthProvider;
  static CognitoConfig = CognitoConfig;
  static DnsMap = DnsMap;
  static EventConfig = EventConfig;
  static EventLogConfig = EventLogConfig;
  static LambdaAuthorizerConfig = LambdaAuthorizerConfig;
  static OpenIDConnectConfig = OpenIDConnectConfig;
  constructor(properties: ApiProperties) {
    super('AWS::AppSync::Api', properties);
  }
}
