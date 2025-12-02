import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Action {
  InvokeApi!: ActionInvokeApi;
  constructor(properties: Action) {
    Object.assign(this, properties);
  }
}

export class ActionInvokeApi {
  StripBasePath?: Value<boolean>;
  Stage!: Value<string>;
  ApiId!: Value<string>;
  constructor(properties: ActionInvokeApi) {
    Object.assign(this, properties);
  }
}

export class Condition {
  MatchBasePaths?: MatchBasePaths;
  MatchHeaders?: MatchHeaders;
  constructor(properties: Condition) {
    Object.assign(this, properties);
  }
}

export class MatchBasePaths {
  AnyOf!: List<Value<string>>;
  constructor(properties: MatchBasePaths) {
    Object.assign(this, properties);
  }
}

export class MatchHeaderValue {
  ValueGlob!: Value<string>;
  Header!: Value<string>;
  constructor(properties: MatchHeaderValue) {
    Object.assign(this, properties);
  }
}

export class MatchHeaders {
  AnyOf!: List<MatchHeaderValue>;
  constructor(properties: MatchHeaders) {
    Object.assign(this, properties);
  }
}
export interface RoutingRuleProperties {
  Actions: List<Action>;
  Priority: Value<number>;
  DomainNameArn: Value<string>;
  Conditions: List<Condition>;
}
export default class RoutingRule extends ResourceBase<RoutingRuleProperties> {
  static Action = Action;
  static ActionInvokeApi = ActionInvokeApi;
  static Condition = Condition;
  static MatchBasePaths = MatchBasePaths;
  static MatchHeaderValue = MatchHeaderValue;
  static MatchHeaders = MatchHeaders;
  constructor(properties: RoutingRuleProperties) {
    super('AWS::ApiGatewayV2::RoutingRule', properties);
  }
}
