import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IncrementalRunConfig {
  IncrementalRunType!: Value<string>;
  constructor(properties: IncrementalRunConfig) {
    Object.assign(this, properties);
  }
}

export class InputSource {
  ApplyNormalization?: Value<boolean>;
  InputSourceARN!: Value<string>;
  SchemaArn!: Value<string>;
  constructor(properties: InputSource) {
    Object.assign(this, properties);
  }
}

export class IntermediateSourceConfiguration {
  IntermediateS3Path!: Value<string>;
  constructor(properties: IntermediateSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class OutputAttribute {
  Hashed?: Value<boolean>;
  Name!: Value<string>;
  constructor(properties: OutputAttribute) {
    Object.assign(this, properties);
  }
}

export class OutputSource {
  KMSArn?: Value<string>;
  OutputS3Path!: Value<string>;
  Output!: List<OutputAttribute>;
  ApplyNormalization?: Value<boolean>;
  constructor(properties: OutputSource) {
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

export class ResolutionTechniques {
  RuleBasedProperties?: RuleBasedProperties;
  ProviderProperties?: ProviderProperties;
  ResolutionType?: Value<string>;
  RuleConditionProperties?: RuleConditionProperties;
  constructor(properties: ResolutionTechniques) {
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

export class RuleBasedProperties {
  AttributeMatchingModel!: Value<string>;
  MatchPurpose?: Value<string>;
  Rules!: List<Rule>;
  constructor(properties: RuleBasedProperties) {
    Object.assign(this, properties);
  }
}

export class RuleCondition {
  Condition?: Value<string>;
  RuleName?: Value<string>;
  constructor(properties: RuleCondition) {
    Object.assign(this, properties);
  }
}

export class RuleConditionProperties {
  Rules!: List<RuleCondition>;
  constructor(properties: RuleConditionProperties) {
    Object.assign(this, properties);
  }
}
export interface MatchingWorkflowProperties {
  ResolutionTechniques: ResolutionTechniques;
  Description?: Value<string>;
  InputSourceConfig: List<InputSource>;
  WorkflowName: Value<string>;
  IncrementalRunConfig?: IncrementalRunConfig;
  OutputSourceConfig: List<OutputSource>;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class MatchingWorkflow extends ResourceBase<MatchingWorkflowProperties> {
  static IncrementalRunConfig = IncrementalRunConfig;
  static InputSource = InputSource;
  static IntermediateSourceConfiguration = IntermediateSourceConfiguration;
  static OutputAttribute = OutputAttribute;
  static OutputSource = OutputSource;
  static ProviderProperties = ProviderProperties;
  static ResolutionTechniques = ResolutionTechniques;
  static Rule = Rule;
  static RuleBasedProperties = RuleBasedProperties;
  static RuleCondition = RuleCondition;
  static RuleConditionProperties = RuleConditionProperties;
  constructor(properties: MatchingWorkflowProperties) {
    super('AWS::EntityResolution::MatchingWorkflow', properties);
  }
}
