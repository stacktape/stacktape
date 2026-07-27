import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class EntityIdentifier {
  EntityType!: Value<string>;
  EntityId!: Value<string>;
  constructor(properties: EntityIdentifier) {
    Object.assign(this, properties);
  }
}

export class PolicyDefinition {
  Static?: StaticPolicyDefinition;
  TemplateLinked?: TemplateLinkedPolicyDefinition;
  constructor(properties: PolicyDefinition) {
    Object.assign(this, properties);
  }
}

export class StaticPolicyDefinition {
  Description?: Value<string>;
  Statement!: Value<string>;
  constructor(properties: StaticPolicyDefinition) {
    Object.assign(this, properties);
  }
}

export class TemplateLinkedPolicyDefinition {
  Resource?: EntityIdentifier;
  PolicyTemplateId!: Value<string>;
  Principal?: EntityIdentifier;
  constructor(properties: TemplateLinkedPolicyDefinition) {
    Object.assign(this, properties);
  }
}
export interface PolicyProperties {
  Definition: PolicyDefinition;
  PolicyStoreId: Value<string>;
}
export default class Policy extends ResourceBase<PolicyProperties> {
  static EntityIdentifier = EntityIdentifier;
  static PolicyDefinition = PolicyDefinition;
  static StaticPolicyDefinition = StaticPolicyDefinition;
  static TemplateLinkedPolicyDefinition = TemplateLinkedPolicyDefinition;
  constructor(properties: PolicyProperties) {
    super('AWS::VerifiedPermissions::Policy', properties);
  }
}
