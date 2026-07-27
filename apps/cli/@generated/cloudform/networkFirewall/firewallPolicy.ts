import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ActionDefinition {
  PublishMetricAction?: PublishMetricAction;
  constructor(properties: ActionDefinition) {
    Object.assign(this, properties);
  }
}

export class CustomAction {
  ActionName!: Value<string>;
  ActionDefinition!: ActionDefinition;
  constructor(properties: CustomAction) {
    Object.assign(this, properties);
  }
}

export class Dimension {
  Value!: Value<string>;
  constructor(properties: Dimension) {
    Object.assign(this, properties);
  }
}

export class FirewallPolicyInner {
  StatelessRuleGroupReferences?: List<StatelessRuleGroupReference>;
  StatefulRuleGroupReferences?: List<StatefulRuleGroupReference>;
  EnableTLSSessionHolding?: Value<boolean>;
  StatelessDefaultActions!: List<Value<string>>;
  StatefulEngineOptions?: StatefulEngineOptions;
  StatelessCustomActions?: List<CustomAction>;
  StatelessFragmentDefaultActions!: List<Value<string>>;
  PolicyVariables?: PolicyVariables;
  StatefulDefaultActions?: List<Value<string>>;
  TLSInspectionConfigurationArn?: Value<string>;
  constructor(properties: FirewallPolicyInner) {
    Object.assign(this, properties);
  }
}

export class FlowTimeouts {
  TcpIdleTimeoutSeconds?: Value<number>;
  constructor(properties: FlowTimeouts) {
    Object.assign(this, properties);
  }
}

export class IPSet {
  Definition?: List<Value<string>>;
  constructor(properties: IPSet) {
    Object.assign(this, properties);
  }
}

export class PolicyVariables {
  RuleVariables?: { [key: string]: IPSet };
  constructor(properties: PolicyVariables) {
    Object.assign(this, properties);
  }
}

export class PublishMetricAction {
  Dimensions!: List<Dimension>;
  constructor(properties: PublishMetricAction) {
    Object.assign(this, properties);
  }
}

export class StatefulEngineOptions {
  StreamExceptionPolicy?: Value<string>;
  FlowTimeouts?: FlowTimeouts;
  RuleOrder?: Value<string>;
  constructor(properties: StatefulEngineOptions) {
    Object.assign(this, properties);
  }
}

export class StatefulRuleGroupOverride {
  Action?: Value<string>;
  constructor(properties: StatefulRuleGroupOverride) {
    Object.assign(this, properties);
  }
}

export class StatefulRuleGroupReference {
  ResourceArn!: Value<string>;
  Priority?: Value<number>;
  Override?: StatefulRuleGroupOverride;
  DeepThreatInspection?: Value<boolean>;
  constructor(properties: StatefulRuleGroupReference) {
    Object.assign(this, properties);
  }
}

export class StatelessRuleGroupReference {
  ResourceArn!: Value<string>;
  Priority!: Value<number>;
  constructor(properties: StatelessRuleGroupReference) {
    Object.assign(this, properties);
  }
}
export interface FirewallPolicyProperties {
  Description?: Value<string>;
  FirewallPolicyName: Value<string>;
  Tags?: List<ResourceTag>;
  FirewallPolicy: FirewallPolicy;
}
export default class FirewallPolicy extends ResourceBase<FirewallPolicyProperties> {
  static ActionDefinition = ActionDefinition;
  static CustomAction = CustomAction;
  static Dimension = Dimension;
  static FirewallPolicy = FirewallPolicyInner;
  static FlowTimeouts = FlowTimeouts;
  static IPSet = IPSet;
  static PolicyVariables = PolicyVariables;
  static PublishMetricAction = PublishMetricAction;
  static StatefulEngineOptions = StatefulEngineOptions;
  static StatefulRuleGroupOverride = StatefulRuleGroupOverride;
  static StatefulRuleGroupReference = StatefulRuleGroupReference;
  static StatelessRuleGroupReference = StatelessRuleGroupReference;
  constructor(properties: FirewallPolicyProperties) {
    super('AWS::NetworkFirewall::FirewallPolicy', properties);
  }
}
