import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AIAgentConfiguration {
  CaseSummarizationAIAgentConfiguration?: CaseSummarizationAIAgentConfiguration;
  ManualSearchAIAgentConfiguration?: ManualSearchAIAgentConfiguration;
  EmailOverviewAIAgentConfiguration?: EmailOverviewAIAgentConfiguration;
  OrchestrationAIAgentConfiguration?: OrchestrationAIAgentConfiguration;
  SelfServiceAIAgentConfiguration?: SelfServiceAIAgentConfiguration;
  EmailResponseAIAgentConfiguration?: EmailResponseAIAgentConfiguration;
  NoteTakingAIAgentConfiguration?: NoteTakingAIAgentConfiguration;
  AnswerRecommendationAIAgentConfiguration?: AnswerRecommendationAIAgentConfiguration;
  EmailGenerativeAnswerAIAgentConfiguration?: EmailGenerativeAnswerAIAgentConfiguration;
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

export class CaseSummarizationAIAgentConfiguration {
  Locale?: Value<string>;
  CaseSummarizationAIPromptId?: Value<string>;
  CaseSummarizationAIGuardrailId?: Value<string>;
  constructor(properties: CaseSummarizationAIAgentConfiguration) {
    Object.assign(this, properties);
  }
}

export class EmailGenerativeAnswerAIAgentConfiguration {
  EmailGenerativeAnswerAIPromptId?: Value<string>;
  Locale?: Value<string>;
  EmailQueryReformulationAIPromptId?: Value<string>;
  AssociationConfigurations?: List<AssociationConfiguration>;
  constructor(properties: EmailGenerativeAnswerAIAgentConfiguration) {
    Object.assign(this, properties);
  }
}

export class EmailOverviewAIAgentConfiguration {
  Locale?: Value<string>;
  EmailOverviewAIPromptId?: Value<string>;
  constructor(properties: EmailOverviewAIAgentConfiguration) {
    Object.assign(this, properties);
  }
}

export class EmailResponseAIAgentConfiguration {
  Locale?: Value<string>;
  EmailResponseAIPromptId?: Value<string>;
  EmailQueryReformulationAIPromptId?: Value<string>;
  AssociationConfigurations?: List<AssociationConfiguration>;
  constructor(properties: EmailResponseAIAgentConfiguration) {
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

export class NoteTakingAIAgentConfiguration {
  Locale?: Value<string>;
  NoteTakingAIGuardrailId?: Value<string>;
  NoteTakingAIPromptId?: Value<string>;
  constructor(properties: NoteTakingAIAgentConfiguration) {
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

export class OrchestrationAIAgentConfiguration {
  OrchestrationAIPromptId!: Value<string>;
  Locale?: Value<string>;
  ToolConfigurations?: List<ToolConfiguration>;
  OrchestrationAIGuardrailId?: Value<string>;
  ConnectInstanceArn?: Value<string>;
  constructor(properties: OrchestrationAIAgentConfiguration) {
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

export class ToolConfiguration {
  OutputFilters?: List<ToolOutputFilter>;
  OutputSchema?: { [key: string]: any };
  UserInteractionConfiguration?: UserInteractionConfiguration;
  Description?: Value<string>;
  InputSchema?: { [key: string]: any };
  Annotations?: { [key: string]: any };
  ToolName!: Value<string>;
  ToolId?: Value<string>;
  ToolType!: Value<string>;
  Title?: Value<string>;
  OverrideInputValues?: List<ToolOverrideInputValue>;
  Instruction?: ToolInstruction;
  constructor(properties: ToolConfiguration) {
    Object.assign(this, properties);
  }
}

export class ToolInstruction {
  Instruction?: Value<string>;
  Examples?: List<Value<string>>;
  constructor(properties: ToolInstruction) {
    Object.assign(this, properties);
  }
}

export class ToolOutputConfiguration {
  SessionDataNamespace?: Value<string>;
  OutputVariableNameOverride?: Value<string>;
  constructor(properties: ToolOutputConfiguration) {
    Object.assign(this, properties);
  }
}

export class ToolOutputFilter {
  OutputConfiguration?: ToolOutputConfiguration;
  JsonPath!: Value<string>;
  constructor(properties: ToolOutputFilter) {
    Object.assign(this, properties);
  }
}

export class ToolOverrideConstantInputValue {
  Type!: Value<string>;
  Value!: Value<string>;
  constructor(properties: ToolOverrideConstantInputValue) {
    Object.assign(this, properties);
  }
}

export class ToolOverrideInputValue {
  Value!: ToolOverrideInputValueConfiguration;
  JsonPath!: Value<string>;
  constructor(properties: ToolOverrideInputValue) {
    Object.assign(this, properties);
  }
}

export class ToolOverrideInputValueConfiguration {
  Constant!: ToolOverrideConstantInputValue;
  constructor(properties: ToolOverrideInputValueConfiguration) {
    Object.assign(this, properties);
  }
}

export class UserInteractionConfiguration {
  IsUserConfirmationRequired?: Value<boolean>;
  constructor(properties: UserInteractionConfiguration) {
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
  static CaseSummarizationAIAgentConfiguration = CaseSummarizationAIAgentConfiguration;
  static EmailGenerativeAnswerAIAgentConfiguration = EmailGenerativeAnswerAIAgentConfiguration;
  static EmailOverviewAIAgentConfiguration = EmailOverviewAIAgentConfiguration;
  static EmailResponseAIAgentConfiguration = EmailResponseAIAgentConfiguration;
  static KnowledgeBaseAssociationConfigurationData = KnowledgeBaseAssociationConfigurationData;
  static ManualSearchAIAgentConfiguration = ManualSearchAIAgentConfiguration;
  static NoteTakingAIAgentConfiguration = NoteTakingAIAgentConfiguration;
  static OrCondition = OrCondition;
  static OrchestrationAIAgentConfiguration = OrchestrationAIAgentConfiguration;
  static SelfServiceAIAgentConfiguration = SelfServiceAIAgentConfiguration;
  static TagCondition = TagCondition;
  static TagFilter = TagFilter;
  static ToolConfiguration = ToolConfiguration;
  static ToolInstruction = ToolInstruction;
  static ToolOutputConfiguration = ToolOutputConfiguration;
  static ToolOutputFilter = ToolOutputFilter;
  static ToolOverrideConstantInputValue = ToolOverrideConstantInputValue;
  static ToolOverrideInputValue = ToolOverrideInputValue;
  static ToolOverrideInputValueConfiguration = ToolOverrideInputValueConfiguration;
  static UserInteractionConfiguration = UserInteractionConfiguration;
  constructor(properties: AIAgentProperties) {
    super('AWS::Wisdom::AIAgent', properties);
  }
}
