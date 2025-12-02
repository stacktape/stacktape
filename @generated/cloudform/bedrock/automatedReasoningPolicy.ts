import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class PolicyDefinition {
  Variables?: List<PolicyDefinitionVariable>;
  Types?: List<PolicyDefinitionType>;
  Version?: Value<string>;
  Rules?: List<PolicyDefinitionRule>;
  constructor(properties: PolicyDefinition) {
    Object.assign(this, properties);
  }
}

export class PolicyDefinitionRule {
  AlternateExpression?: Value<string>;
  Expression!: Value<string>;
  Id!: Value<string>;
  constructor(properties: PolicyDefinitionRule) {
    Object.assign(this, properties);
  }
}

export class PolicyDefinitionType {
  Description?: Value<string>;
  Values!: List<PolicyDefinitionTypeValue>;
  Name!: Value<string>;
  constructor(properties: PolicyDefinitionType) {
    Object.assign(this, properties);
  }
}

export class PolicyDefinitionTypeValue {
  Description?: Value<string>;
  Value!: Value<string>;
  constructor(properties: PolicyDefinitionTypeValue) {
    Object.assign(this, properties);
  }
}

export class PolicyDefinitionVariable {
  Type!: Value<string>;
  Description!: Value<string>;
  Name!: Value<string>;
  constructor(properties: PolicyDefinitionVariable) {
    Object.assign(this, properties);
  }
}
export interface AutomatedReasoningPolicyProperties {
  Description?: Value<string>;
  KmsKeyId?: Value<string>;
  PolicyDefinition?: PolicyDefinition;
  ForceDelete?: Value<boolean>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class AutomatedReasoningPolicy extends ResourceBase<AutomatedReasoningPolicyProperties> {
  static PolicyDefinition = PolicyDefinition;
  static PolicyDefinitionRule = PolicyDefinitionRule;
  static PolicyDefinitionType = PolicyDefinitionType;
  static PolicyDefinitionTypeValue = PolicyDefinitionTypeValue;
  static PolicyDefinitionVariable = PolicyDefinitionVariable;
  constructor(properties: AutomatedReasoningPolicyProperties) {
    super('AWS::Bedrock::AutomatedReasoningPolicy', properties);
  }
}
