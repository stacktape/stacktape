import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Action {
  Order?: Value<number>;
  TargetGroupArn?: Value<string>;
  FixedResponseConfig?: FixedResponseConfig;
  AuthenticateCognitoConfig?: AuthenticateCognitoConfig;
  Type!: Value<string>;
  RedirectConfig?: RedirectConfig;
  ForwardConfig?: ForwardConfig;
  AuthenticateOidcConfig?: AuthenticateOidcConfig;
  constructor(properties: Action) {
    Object.assign(this, properties);
  }
}

export class AuthenticateCognitoConfig {
  OnUnauthenticatedRequest?: Value<string>;
  UserPoolClientId!: Value<string>;
  UserPoolDomain!: Value<string>;
  SessionTimeout?: Value<string>;
  Scope?: Value<string>;
  SessionCookieName?: Value<string>;
  UserPoolArn!: Value<string>;
  AuthenticationRequestExtraParams?: { [key: string]: Value<string> };
  constructor(properties: AuthenticateCognitoConfig) {
    Object.assign(this, properties);
  }
}

export class AuthenticateOidcConfig {
  UseExistingClientSecret?: Value<boolean>;
  OnUnauthenticatedRequest?: Value<string>;
  TokenEndpoint!: Value<string>;
  SessionTimeout?: Value<string>;
  Scope?: Value<string>;
  Issuer!: Value<string>;
  ClientSecret?: Value<string>;
  UserInfoEndpoint!: Value<string>;
  ClientId!: Value<string>;
  AuthorizationEndpoint!: Value<string>;
  SessionCookieName?: Value<string>;
  AuthenticationRequestExtraParams?: { [key: string]: Value<string> };
  constructor(properties: AuthenticateOidcConfig) {
    Object.assign(this, properties);
  }
}

export class Certificate {
  CertificateArn?: Value<string>;
  constructor(properties: Certificate) {
    Object.assign(this, properties);
  }
}

export class FixedResponseConfig {
  ContentType?: Value<string>;
  StatusCode!: Value<string>;
  MessageBody?: Value<string>;
  constructor(properties: FixedResponseConfig) {
    Object.assign(this, properties);
  }
}

export class ForwardConfig {
  TargetGroupStickinessConfig?: TargetGroupStickinessConfig;
  TargetGroups?: List<TargetGroupTuple>;
  constructor(properties: ForwardConfig) {
    Object.assign(this, properties);
  }
}

export class ListenerAttribute {
  Value?: Value<string>;
  Key?: Value<string>;
  constructor(properties: ListenerAttribute) {
    Object.assign(this, properties);
  }
}

export class MutualAuthentication {
  IgnoreClientCertificateExpiry?: Value<boolean>;
  Mode?: Value<string>;
  TrustStoreArn?: Value<string>;
  AdvertiseTrustStoreCaNames?: Value<string>;
  constructor(properties: MutualAuthentication) {
    Object.assign(this, properties);
  }
}

export class RedirectConfig {
  Path?: Value<string>;
  Query?: Value<string>;
  Port?: Value<string>;
  Host?: Value<string>;
  Protocol?: Value<string>;
  StatusCode!: Value<string>;
  constructor(properties: RedirectConfig) {
    Object.assign(this, properties);
  }
}

export class TargetGroupStickinessConfig {
  Enabled?: Value<boolean>;
  DurationSeconds?: Value<number>;
  constructor(properties: TargetGroupStickinessConfig) {
    Object.assign(this, properties);
  }
}

export class TargetGroupTuple {
  TargetGroupArn?: Value<string>;
  Weight?: Value<number>;
  constructor(properties: TargetGroupTuple) {
    Object.assign(this, properties);
  }
}
export interface ListenerProperties {
  MutualAuthentication?: MutualAuthentication;
  ListenerAttributes?: List<ListenerAttribute>;
  AlpnPolicy?: List<Value<string>>;
  SslPolicy?: Value<string>;
  LoadBalancerArn: Value<string>;
  DefaultActions: List<Action>;
  Port?: Value<number>;
  Certificates?: List<Certificate>;
  Protocol?: Value<string>;
}
export default class Listener extends ResourceBase<ListenerProperties> {
  static Action = Action;
  static AuthenticateCognitoConfig = AuthenticateCognitoConfig;
  static AuthenticateOidcConfig = AuthenticateOidcConfig;
  static Certificate = Certificate;
  static FixedResponseConfig = FixedResponseConfig;
  static ForwardConfig = ForwardConfig;
  static ListenerAttribute = ListenerAttribute;
  static MutualAuthentication = MutualAuthentication;
  static RedirectConfig = RedirectConfig;
  static TargetGroupStickinessConfig = TargetGroupStickinessConfig;
  static TargetGroupTuple = TargetGroupTuple;
  constructor(properties: ListenerProperties) {
    super('AWS::ElasticLoadBalancingV2::Listener', properties);
  }
}
