import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IdMappingIncrementalRunConfig {
  IncrementalRunType!: Value<string>;
  constructor(properties: IdMappingIncrementalRunConfig) {
    Object.assign(this, properties);
  }
}

export class IdMappingRuleBasedProperties {
  AttributeMatchingModel!: Value<string>;
  RuleDefinitionType?: Value<string>;
  Rules?: List<Rule>;
  RecordMatchingModel!: Value<string>;
  constructor(properties: IdMappingRuleBasedProperties) {
    Object.assign(this, properties);
  }
}

export class IdMappingTechniques {
  RuleBasedProperties?: IdMappingRuleBasedProperties;
  ProviderProperties?: ProviderProperties;
  IdMappingType?: Value<string>;
  NormalizationVersion?: Value<string>;
  constructor(properties: IdMappingTechniques) {
    Object.assign(this, properties);
  }
}

export class IdMappingWorkflowInputSource {
  Type?: Value<string>;
  InputSourceARN!: Value<string>;
  SchemaArn?: Value<string>;
  constructor(properties: IdMappingWorkflowInputSource) {
    Object.assign(this, properties);
  }
}

export class IdMappingWorkflowOutputSource {
  KMSArn?: Value<string>;
  OutputS3Path!: Value<string>;
  constructor(properties: IdMappingWorkflowOutputSource) {
    Object.assign(this, properties);
  }
}

export class IntermediateSourceConfiguration {
  IntermediateS3Path!: Value<string>;
  constructor(properties: IntermediateSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class ProviderProperties {
  IntermediateSourceConfiguration?: IntermediateSourceConfiguration;
  ProviderServiceArn!: Value<string>;
  ProviderConfiguration?: { [key: string]: Value<string> };
  constructor(properties: ProviderProperties) {
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
export interface IdMappingWorkflowProperties {
  Description?: Value<string>;
  InputSourceConfig: List<IdMappingWorkflowInputSource>;
  IdMappingTechniques: IdMappingTechniques;
  WorkflowName: Value<string>;
  OutputSourceConfig?: List<IdMappingWorkflowOutputSource>;
  IdMappingIncrementalRunConfig?: IdMappingIncrementalRunConfig;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class IdMappingWorkflow extends ResourceBase<IdMappingWorkflowProperties> {
  static IdMappingIncrementalRunConfig = IdMappingIncrementalRunConfig;
  static IdMappingRuleBasedProperties = IdMappingRuleBasedProperties;
  static IdMappingTechniques = IdMappingTechniques;
  static IdMappingWorkflowInputSource = IdMappingWorkflowInputSource;
  static IdMappingWorkflowOutputSource = IdMappingWorkflowOutputSource;
  static IntermediateSourceConfiguration = IntermediateSourceConfiguration;
  static ProviderProperties = ProviderProperties;
  static Rule = Rule;
  constructor(properties: IdMappingWorkflowProperties) {
    super('AWS::EntityResolution::IdMappingWorkflow', properties);
  }
}
