import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class CedarPolicy {
  Statement!: Value<string>;
  constructor(properties: CedarPolicy) {
    Object.assign(this, properties);
  }
}

export class PolicyDefinition {
  Cedar!: CedarPolicy;
  constructor(properties: PolicyDefinition) {
    Object.assign(this, properties);
  }
}
export interface PolicyProperties {
  Description?: Value<string>;
  PolicyEngineId: Value<string>;
  Definition: PolicyDefinition;
  ValidationMode?: Value<string>;
  Name: Value<string>;
}
export default class Policy extends ResourceBase<PolicyProperties> {
  static CedarPolicy = CedarPolicy;
  static PolicyDefinition = PolicyDefinition;
  constructor(properties: PolicyProperties) {
    super('AWS::BedrockAgentCore::Policy', properties);
  }
}
