import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ActionThreshold {
  Type!: Value<string>;
  Value!: Value<number>;
  constructor(properties: ActionThreshold) {
    Object.assign(this, properties);
  }
}

export class Definition {
  SsmActionDefinition?: SsmActionDefinition;
  IamActionDefinition?: IamActionDefinition;
  ScpActionDefinition?: ScpActionDefinition;
  constructor(properties: Definition) {
    Object.assign(this, properties);
  }
}

export class IamActionDefinition {
  PolicyArn!: Value<string>;
  Groups?: List<Value<string>>;
  Roles?: List<Value<string>>;
  Users?: List<Value<string>>;
  constructor(properties: IamActionDefinition) {
    Object.assign(this, properties);
  }
}

export class ResourceTag {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: ResourceTag) {
    Object.assign(this, properties);
  }
}

export class ScpActionDefinition {
  TargetIds!: List<Value<string>>;
  PolicyId!: Value<string>;
  constructor(properties: ScpActionDefinition) {
    Object.assign(this, properties);
  }
}

export class SsmActionDefinition {
  Region!: Value<string>;
  InstanceIds!: List<Value<string>>;
  Subtype!: Value<string>;
  constructor(properties: SsmActionDefinition) {
    Object.assign(this, properties);
  }
}

export class Subscriber {
  Type!: Value<string>;
  Address!: Value<string>;
  constructor(properties: Subscriber) {
    Object.assign(this, properties);
  }
}
export interface BudgetsActionProperties {
  ExecutionRoleArn: Value<string>;
  ActionType: Value<string>;
  ResourceTags?: List<ResourceTag>;
  NotificationType: Value<string>;
  ActionThreshold: ActionThreshold;
  Definition: Definition;
  ApprovalModel?: Value<string>;
  Subscribers: List<Subscriber>;
  BudgetName: Value<string>;
}
export default class BudgetsAction extends ResourceBase<BudgetsActionProperties> {
  static ActionThreshold = ActionThreshold;
  static Definition = Definition;
  static IamActionDefinition = IamActionDefinition;
  static ResourceTag = ResourceTag;
  static ScpActionDefinition = ScpActionDefinition;
  static SsmActionDefinition = SsmActionDefinition;
  static Subscriber = Subscriber;
  constructor(properties: BudgetsActionProperties) {
    super('AWS::Budgets::BudgetsAction', properties);
  }
}
