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
  SessionTimeout?: Value<number>;
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
  SessionTimeout?: Value<number>;
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

export class HostHeaderConfig {
  Values?: List<Value<string>>;
  RegexValues?: List<Value<string>>;
  constructor(properties: HostHeaderConfig) {
    Object.assign(this, properties);
  }
}

export class HttpHeaderConfig {
  Values?: List<Value<string>>;
  RegexValues?: List<Value<string>>;
  HttpHeaderName?: Value<string>;
  constructor(properties: HttpHeaderConfig) {
    Object.assign(this, properties);
  }
}

export class HttpRequestMethodConfig {
  Values?: List<Value<string>>;
  constructor(properties: HttpRequestMethodConfig) {
    Object.assign(this, properties);
  }
}

export class PathPatternConfig {
  Values?: List<Value<string>>;
  RegexValues?: List<Value<string>>;
  constructor(properties: PathPatternConfig) {
    Object.assign(this, properties);
  }
}

export class QueryStringConfig {
  Values?: List<QueryStringKeyValue>;
  constructor(properties: QueryStringConfig) {
    Object.assign(this, properties);
  }
}

export class QueryStringKeyValue {
  Value?: Value<string>;
  Key?: Value<string>;
  constructor(properties: QueryStringKeyValue) {
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

export class RewriteConfig {
  Replace!: Value<string>;
  Regex!: Value<string>;
  constructor(properties: RewriteConfig) {
    Object.assign(this, properties);
  }
}

export class RewriteConfigObject {
  Rewrites!: List<RewriteConfig>;
  constructor(properties: RewriteConfigObject) {
    Object.assign(this, properties);
  }
}

export class RuleCondition {
  Field?: Value<string>;
  HttpHeaderConfig?: HttpHeaderConfig;
  Values?: List<Value<string>>;
  QueryStringConfig?: QueryStringConfig;
  RegexValues?: List<Value<string>>;
  HostHeaderConfig?: HostHeaderConfig;
  HttpRequestMethodConfig?: HttpRequestMethodConfig;
  PathPatternConfig?: PathPatternConfig;
  SourceIpConfig?: SourceIpConfig;
  constructor(properties: RuleCondition) {
    Object.assign(this, properties);
  }
}

export class SourceIpConfig {
  Values?: List<Value<string>>;
  constructor(properties: SourceIpConfig) {
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

export class Transform {
  Type!: Value<string>;
  UrlRewriteConfig?: RewriteConfigObject;
  HostHeaderRewriteConfig?: RewriteConfigObject;
  constructor(properties: Transform) {
    Object.assign(this, properties);
  }
}
export interface ListenerRuleProperties {
  ListenerArn?: Value<string>;
  Actions: List<Action>;
  Priority: Value<number>;
  Transforms?: List<Transform>;
  Conditions: List<RuleCondition>;
}
export default class ListenerRule extends ResourceBase<ListenerRuleProperties> {
  static Action = Action;
  static AuthenticateCognitoConfig = AuthenticateCognitoConfig;
  static AuthenticateOidcConfig = AuthenticateOidcConfig;
  static FixedResponseConfig = FixedResponseConfig;
  static ForwardConfig = ForwardConfig;
  static HostHeaderConfig = HostHeaderConfig;
  static HttpHeaderConfig = HttpHeaderConfig;
  static HttpRequestMethodConfig = HttpRequestMethodConfig;
  static PathPatternConfig = PathPatternConfig;
  static QueryStringConfig = QueryStringConfig;
  static QueryStringKeyValue = QueryStringKeyValue;
  static RedirectConfig = RedirectConfig;
  static RewriteConfig = RewriteConfig;
  static RewriteConfigObject = RewriteConfigObject;
  static RuleCondition = RuleCondition;
  static SourceIpConfig = SourceIpConfig;
  static TargetGroupStickinessConfig = TargetGroupStickinessConfig;
  static TargetGroupTuple = TargetGroupTuple;
  static Transform = Transform;
  constructor(properties: ListenerRuleProperties) {
    super('AWS::ElasticLoadBalancingV2::ListenerRule', properties);
  }
}
