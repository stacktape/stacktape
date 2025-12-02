import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IdNamespaceIdMappingWorkflowProperties {
  RuleBasedProperties?: NamespaceRuleBasedProperties;
  ProviderProperties?: NamespaceProviderProperties;
  IdMappingType!: Value<string>;
  constructor(properties: IdNamespaceIdMappingWorkflowProperties) {
    Object.assign(this, properties);
  }
}

export class IdNamespaceInputSource {
  InputSourceARN!: Value<string>;
  SchemaName?: Value<string>;
  constructor(properties: IdNamespaceInputSource) {
    Object.assign(this, properties);
  }
}

export class NamespaceProviderProperties {
  ProviderServiceArn!: Value<string>;
  ProviderConfiguration?: { [key: string]: Value<string> };
  constructor(properties: NamespaceProviderProperties) {
    Object.assign(this, properties);
  }
}

export class NamespaceRuleBasedProperties {
  AttributeMatchingModel?: Value<string>;
  RuleDefinitionTypes?: List<Value<string>>;
  RecordMatchingModels?: List<Value<string>>;
  Rules?: List<Rule>;
  constructor(properties: NamespaceRuleBasedProperties) {
    Object.assign(this, properties);
  }
}

export class Rule {
  MatchingKeys!: List<Value<string>>;
  RuleName!: Value<string>;
  constructor(properties: Rule) {
    Object.assign(this, properties);
  }
}
export interface IdNamespaceProperties {
  IdNamespaceName: Value<string>;
  Type: Value<string>;
  Description?: Value<string>;
  InputSourceConfig?: List<IdNamespaceInputSource>;
  IdMappingWorkflowProperties?: List<IdNamespaceIdMappingWorkflowProperties>;
  RoleArn?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class IdNamespace extends ResourceBase<IdNamespaceProperties> {
  static IdNamespaceIdMappingWorkflowProperties = IdNamespaceIdMappingWorkflowProperties;
  static IdNamespaceInputSource = IdNamespaceInputSource;
  static NamespaceProviderProperties = NamespaceProviderProperties;
  static NamespaceRuleBasedProperties = NamespaceRuleBasedProperties;
  static Rule = Rule;
  constructor(properties: IdNamespaceProperties) {
    super('AWS::EntityResolution::IdNamespace', properties);
  }
}
