import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AIAgentConfiguration {
  ManualSearchAIAgentConfiguration?: ManualSearchAIAgentConfiguration;
  SelfServiceAIAgentConfiguration?: SelfServiceAIAgentConfiguration;
  AnswerRecommendationAIAgentConfiguration?: AnswerRecommendationAIAgentConfiguration;
  constructor(properties: AIAgentConfiguration) {
    Object.assign(this, properties);
  }
}

export class AnswerRecommendationAIAgentConfiguration {
  Locale?: Value<string>;
  AnswerGenerationAIPromptId?: Value<string>;
  IntentLabelingGenerationAIPromptId?: Value<string>;
  QueryReformulationAIPromptId?: Value<string>;
  AnswerGenerationAIGuardrailId?: Value<string>;
  AssociationConfigurations?: List<AssociationConfiguration>;
  constructor(properties: AnswerRecommendationAIAgentConfiguration) {
    Object.assign(this, properties);
  }
}

export class AssociationConfiguration {
  AssociationType?: Value<string>;
  AssociationConfigurationData?: AssociationConfigurationData;
  AssociationId?: Value<string>;
  constructor(properties: AssociationConfiguration) {
    Object.assign(this, properties);
  }
}

export class AssociationConfigurationData {
  KnowledgeBaseAssociationConfigurationData!: KnowledgeBaseAssociationConfigurationData;
  constructor(properties: AssociationConfigurationData) {
    Object.assign(this, properties);
  }
}

export class KnowledgeBaseAssociationConfigurationData {
  MaxResults?: Value<number>;
  ContentTagFilter?: TagFilter;
  OverrideKnowledgeBaseSearchType?: Value<string>;
  constructor(properties: KnowledgeBaseAssociationConfigurationData) {
    Object.assign(this, properties);
  }
}

export class ManualSearchAIAgentConfiguration {
  Locale?: Value<string>;
  AnswerGenerationAIPromptId?: Value<string>;
  AnswerGenerationAIGuardrailId?: Value<string>;
  AssociationConfigurations?: List<AssociationConfiguration>;
  constructor(properties: ManualSearchAIAgentConfiguration) {
    Object.assign(this, properties);
  }
}

export class OrCondition {
  AndConditions?: List<TagCondition>;
  TagCondition?: TagCondition;
  constructor(properties: OrCondition) {
    Object.assign(this, properties);
  }
}

export class SelfServiceAIAgentConfiguration {
  SelfServiceAIGuardrailId?: Value<string>;
  SelfServicePreProcessingAIPromptId?: Value<string>;
  SelfServiceAnswerGenerationAIPromptId?: Value<string>;
  AssociationConfigurations?: List<AssociationConfiguration>;
  constructor(properties: SelfServiceAIAgentConfiguration) {
    Object.assign(this, properties);
  }
}

export class TagCondition {
  Value?: Value<string>;
  Key!: Value<string>;
  constructor(properties: TagCondition) {
    Object.assign(this, properties);
  }
}

export class TagFilter {
  OrConditions?: List<OrCondition>;
  AndConditions?: List<TagCondition>;
  TagCondition?: TagCondition;
  constructor(properties: TagFilter) {
    Object.assign(this, properties);
  }
}
export interface AIAgentProperties {
  Type: Value<string>;
  Description?: Value<string>;
  Configuration: AIAgentConfiguration;
  AssistantId: Value<string>;
  Tags?: { [key: string]: Value<string> };
  Name?: Value<string>;
}
export default class AIAgent extends ResourceBase<AIAgentProperties> {
  static AIAgentConfiguration = AIAgentConfiguration;
  static AnswerRecommendationAIAgentConfiguration = AnswerRecommendationAIAgentConfiguration;
  static AssociationConfiguration = AssociationConfiguration;
  static AssociationConfigurationData = AssociationConfigurationData;
  static KnowledgeBaseAssociationConfigurationData = KnowledgeBaseAssociationConfigurationData;
  static ManualSearchAIAgentConfiguration = ManualSearchAIAgentConfiguration;
  static OrCondition = OrCondition;
  static SelfServiceAIAgentConfiguration = SelfServiceAIAgentConfiguration;
  static TagCondition = TagCondition;
  static TagFilter = TagFilter;
  constructor(properties: AIAgentProperties) {
    super('AWS::Wisdom::AIAgent', properties);
  }
}
