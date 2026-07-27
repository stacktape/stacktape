import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AgentFlowNodeConfiguration {
  AgentAliasArn!: Value<string>;
  constructor(properties: AgentFlowNodeConfiguration) {
    Object.assign(this, properties);
  }
}

export class ConditionFlowNodeConfiguration {
  Conditions!: List<FlowCondition>;
  constructor(properties: ConditionFlowNodeConfiguration) {
    Object.assign(this, properties);
  }
}

export class FieldForReranking {
  FieldName!: Value<string>;
  constructor(properties: FieldForReranking) {
    Object.assign(this, properties);
  }
}

export class FlowCondition {
  Expression?: Value<string>;
  Name!: Value<string>;
  constructor(properties: FlowCondition) {
    Object.assign(this, properties);
  }
}

export class FlowConditionalConnectionConfiguration {
  Condition!: Value<string>;
  constructor(properties: FlowConditionalConnectionConfiguration) {
    Object.assign(this, properties);
  }
}

export class FlowConnection {
  Type!: Value<string>;
  Target!: Value<string>;
  Configuration?: FlowConnectionConfiguration;
  Source!: Value<string>;
  Name!: Value<string>;
  constructor(properties: FlowConnection) {
    Object.assign(this, properties);
  }
}

export class FlowConnectionConfiguration {
  Data?: FlowDataConnectionConfiguration;
  Conditional?: FlowConditionalConnectionConfiguration;
  constructor(properties: FlowConnectionConfiguration) {
    Object.assign(this, properties);
  }
}

export class FlowDataConnectionConfiguration {
  SourceOutput!: Value<string>;
  TargetInput!: Value<string>;
  constructor(properties: FlowDataConnectionConfiguration) {
    Object.assign(this, properties);
  }
}

export class FlowDefinition {
  Connections?: List<FlowConnection>;
  Nodes?: List<FlowNode>;
  constructor(properties: FlowDefinition) {
    Object.assign(this, properties);
  }
}

export class FlowNode {
  Type!: Value<string>;
  Configuration?: FlowNodeConfiguration;
  Outputs?: List<FlowNodeOutput>;
  Inputs?: List<FlowNodeInput>;
  Name!: Value<string>;
  constructor(properties: FlowNode) {
    Object.assign(this, properties);
  }
}

export class FlowNodeConfiguration {
  Condition?: ConditionFlowNodeConfiguration;
  Retrieval?: RetrievalFlowNodeConfiguration;
  Loop?: LoopFlowNodeConfiguration;
  Agent?: AgentFlowNodeConfiguration;
  LambdaFunction?: LambdaFunctionFlowNodeConfiguration;
  InlineCode?: InlineCodeFlowNodeConfiguration;
  LoopController?: LoopControllerFlowNodeConfiguration;
  Input?: { [key: string]: any };
  Storage?: StorageFlowNodeConfiguration;
  KnowledgeBase?: KnowledgeBaseFlowNodeConfiguration;
  Output?: { [key: string]: any };
  Iterator?: { [key: string]: any };
  Collector?: { [key: string]: any };
  LoopInput?: { [key: string]: any };
  Prompt?: PromptFlowNodeConfiguration;
  Lex?: LexFlowNodeConfiguration;
  constructor(properties: FlowNodeConfiguration) {
    Object.assign(this, properties);
  }
}

export class FlowNodeInput {
  Type!: Value<string>;
  Category?: Value<string>;
  Expression!: Value<string>;
  Name!: Value<string>;
  constructor(properties: FlowNodeInput) {
    Object.assign(this, properties);
  }
}

export class FlowNodeOutput {
  Type!: Value<string>;
  Name!: Value<string>;
  constructor(properties: FlowNodeOutput) {
    Object.assign(this, properties);
  }
}

export class FlowValidation {
  Message!: Value<string>;
  constructor(properties: FlowValidation) {
    Object.assign(this, properties);
  }
}

export class GuardrailConfiguration {
  GuardrailIdentifier?: Value<string>;
  GuardrailVersion?: Value<string>;
  constructor(properties: GuardrailConfiguration) {
    Object.assign(this, properties);
  }
}

export class InlineCodeFlowNodeConfiguration {
  Language!: Value<string>;
  Code!: Value<string>;
  constructor(properties: InlineCodeFlowNodeConfiguration) {
    Object.assign(this, properties);
  }
}

export class KnowledgeBaseFlowNodeConfiguration {
  OrchestrationConfiguration?: KnowledgeBaseOrchestrationConfiguration;
  GuardrailConfiguration?: GuardrailConfiguration;
  InferenceConfiguration?: PromptInferenceConfiguration;
  KnowledgeBaseId!: Value<string>;
  PromptTemplate?: KnowledgeBasePromptTemplate;
  RerankingConfiguration?: VectorSearchRerankingConfiguration;
  NumberOfResults?: Value<number>;
  ModelId?: Value<string>;
  constructor(properties: KnowledgeBaseFlowNodeConfiguration) {
    Object.assign(this, properties);
  }
}

export class KnowledgeBaseOrchestrationConfiguration {
  InferenceConfig?: PromptInferenceConfiguration;
  AdditionalModelRequestFields?: { [key: string]: any };
  PerformanceConfig?: PerformanceConfiguration;
  PromptTemplate?: KnowledgeBasePromptTemplate;
  constructor(properties: KnowledgeBaseOrchestrationConfiguration) {
    Object.assign(this, properties);
  }
}

export class KnowledgeBasePromptTemplate {
  TextPromptTemplate!: Value<string>;
  constructor(properties: KnowledgeBasePromptTemplate) {
    Object.assign(this, properties);
  }
}

export class LambdaFunctionFlowNodeConfiguration {
  LambdaArn!: Value<string>;
  constructor(properties: LambdaFunctionFlowNodeConfiguration) {
    Object.assign(this, properties);
  }
}

export class LexFlowNodeConfiguration {
  BotAliasArn!: Value<string>;
  LocaleId!: Value<string>;
  constructor(properties: LexFlowNodeConfiguration) {
    Object.assign(this, properties);
  }
}

export class LoopControllerFlowNodeConfiguration {
  ContinueCondition!: FlowCondition;
  MaxIterations?: Value<number>;
  constructor(properties: LoopControllerFlowNodeConfiguration) {
    Object.assign(this, properties);
  }
}

export class LoopFlowNodeConfiguration {
  Definition!: FlowDefinition;
  constructor(properties: LoopFlowNodeConfiguration) {
    Object.assign(this, properties);
  }
}

export class MetadataConfigurationForReranking {
  SelectiveModeConfiguration?: RerankingMetadataSelectiveModeConfiguration;
  SelectionMode!: Value<string>;
  constructor(properties: MetadataConfigurationForReranking) {
    Object.assign(this, properties);
  }
}

export class PerformanceConfiguration {
  Latency?: Value<string>;
  constructor(properties: PerformanceConfiguration) {
    Object.assign(this, properties);
  }
}

export class PromptFlowNodeConfiguration {
  GuardrailConfiguration?: GuardrailConfiguration;
  SourceConfiguration!: PromptFlowNodeSourceConfiguration;
  constructor(properties: PromptFlowNodeConfiguration) {
    Object.assign(this, properties);
  }
}

export class PromptFlowNodeInlineConfiguration {
  InferenceConfiguration?: PromptInferenceConfiguration;
  TemplateConfiguration!: PromptTemplateConfiguration;
  TemplateType!: Value<string>;
  ModelId!: Value<string>;
  constructor(properties: PromptFlowNodeInlineConfiguration) {
    Object.assign(this, properties);
  }
}

export class PromptFlowNodeResourceConfiguration {
  PromptArn!: Value<string>;
  constructor(properties: PromptFlowNodeResourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class PromptFlowNodeSourceConfiguration {
  Resource?: PromptFlowNodeResourceConfiguration;
  Inline?: PromptFlowNodeInlineConfiguration;
  constructor(properties: PromptFlowNodeSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class PromptInferenceConfiguration {
  Text!: PromptModelInferenceConfiguration;
  constructor(properties: PromptInferenceConfiguration) {
    Object.assign(this, properties);
  }
}

export class PromptInputVariable {
  Name?: Value<string>;
  constructor(properties: PromptInputVariable) {
    Object.assign(this, properties);
  }
}

export class PromptModelInferenceConfiguration {
  Temperature?: Value<number>;
  StopSequences?: List<Value<string>>;
  MaxTokens?: Value<number>;
  TopP?: Value<number>;
  constructor(properties: PromptModelInferenceConfiguration) {
    Object.assign(this, properties);
  }
}

export class PromptTemplateConfiguration {
  Text!: TextPromptTemplateConfiguration;
  constructor(properties: PromptTemplateConfiguration) {
    Object.assign(this, properties);
  }
}

export class RerankingMetadataSelectiveModeConfiguration {
  FieldsToInclude?: List<FieldForReranking>;
  FieldsToExclude?: List<FieldForReranking>;
  constructor(properties: RerankingMetadataSelectiveModeConfiguration) {
    Object.assign(this, properties);
  }
}

export class RetrievalFlowNodeConfiguration {
  ServiceConfiguration!: RetrievalFlowNodeServiceConfiguration;
  constructor(properties: RetrievalFlowNodeConfiguration) {
    Object.assign(this, properties);
  }
}

export class RetrievalFlowNodeS3Configuration {
  BucketName!: Value<string>;
  constructor(properties: RetrievalFlowNodeS3Configuration) {
    Object.assign(this, properties);
  }
}

export class RetrievalFlowNodeServiceConfiguration {
  S3?: RetrievalFlowNodeS3Configuration;
  constructor(properties: RetrievalFlowNodeServiceConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3Location {
  Bucket!: Value<string>;
  Version?: Value<string>;
  Key!: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}

export class StorageFlowNodeConfiguration {
  ServiceConfiguration!: StorageFlowNodeServiceConfiguration;
  constructor(properties: StorageFlowNodeConfiguration) {
    Object.assign(this, properties);
  }
}

export class StorageFlowNodeS3Configuration {
  BucketName!: Value<string>;
  constructor(properties: StorageFlowNodeS3Configuration) {
    Object.assign(this, properties);
  }
}

export class StorageFlowNodeServiceConfiguration {
  S3?: StorageFlowNodeS3Configuration;
  constructor(properties: StorageFlowNodeServiceConfiguration) {
    Object.assign(this, properties);
  }
}

export class TextPromptTemplateConfiguration {
  InputVariables?: List<PromptInputVariable>;
  Text!: Value<string>;
  constructor(properties: TextPromptTemplateConfiguration) {
    Object.assign(this, properties);
  }
}

export class VectorSearchBedrockRerankingConfiguration {
  NumberOfRerankedResults?: Value<number>;
  MetadataConfiguration?: MetadataConfigurationForReranking;
  ModelConfiguration!: VectorSearchBedrockRerankingModelConfiguration;
  constructor(properties: VectorSearchBedrockRerankingConfiguration) {
    Object.assign(this, properties);
  }
}

export class VectorSearchBedrockRerankingModelConfiguration {
  ModelArn!: Value<string>;
  AdditionalModelRequestFields?: { [key: string]: any };
  constructor(properties: VectorSearchBedrockRerankingModelConfiguration) {
    Object.assign(this, properties);
  }
}

export class VectorSearchRerankingConfiguration {
  Type!: Value<string>;
  BedrockRerankingConfiguration?: VectorSearchBedrockRerankingConfiguration;
  constructor(properties: VectorSearchRerankingConfiguration) {
    Object.assign(this, properties);
  }
}
export interface FlowProperties {
  TestAliasTags?: { [key: string]: Value<string> };
  ExecutionRoleArn: Value<string>;
  Description?: Value<string>;
  DefinitionString?: Value<string>;
  Definition?: FlowDefinition;
  DefinitionSubstitutions?: { [key: string]: { [key: string]: any } };
  CustomerEncryptionKeyArn?: Value<string>;
  DefinitionS3Location?: S3Location;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class Flow extends ResourceBase<FlowProperties> {
  static AgentFlowNodeConfiguration = AgentFlowNodeConfiguration;
  static ConditionFlowNodeConfiguration = ConditionFlowNodeConfiguration;
  static FieldForReranking = FieldForReranking;
  static FlowCondition = FlowCondition;
  static FlowConditionalConnectionConfiguration = FlowConditionalConnectionConfiguration;
  static FlowConnection = FlowConnection;
  static FlowConnectionConfiguration = FlowConnectionConfiguration;
  static FlowDataConnectionConfiguration = FlowDataConnectionConfiguration;
  static FlowDefinition = FlowDefinition;
  static FlowNode = FlowNode;
  static FlowNodeConfiguration = FlowNodeConfiguration;
  static FlowNodeInput = FlowNodeInput;
  static FlowNodeOutput = FlowNodeOutput;
  static FlowValidation = FlowValidation;
  static GuardrailConfiguration = GuardrailConfiguration;
  static InlineCodeFlowNodeConfiguration = InlineCodeFlowNodeConfiguration;
  static KnowledgeBaseFlowNodeConfiguration = KnowledgeBaseFlowNodeConfiguration;
  static KnowledgeBaseOrchestrationConfiguration = KnowledgeBaseOrchestrationConfiguration;
  static KnowledgeBasePromptTemplate = KnowledgeBasePromptTemplate;
  static LambdaFunctionFlowNodeConfiguration = LambdaFunctionFlowNodeConfiguration;
  static LexFlowNodeConfiguration = LexFlowNodeConfiguration;
  static LoopControllerFlowNodeConfiguration = LoopControllerFlowNodeConfiguration;
  static LoopFlowNodeConfiguration = LoopFlowNodeConfiguration;
  static MetadataConfigurationForReranking = MetadataConfigurationForReranking;
  static PerformanceConfiguration = PerformanceConfiguration;
  static PromptFlowNodeConfiguration = PromptFlowNodeConfiguration;
  static PromptFlowNodeInlineConfiguration = PromptFlowNodeInlineConfiguration;
  static PromptFlowNodeResourceConfiguration = PromptFlowNodeResourceConfiguration;
  static PromptFlowNodeSourceConfiguration = PromptFlowNodeSourceConfiguration;
  static PromptInferenceConfiguration = PromptInferenceConfiguration;
  static PromptInputVariable = PromptInputVariable;
  static PromptModelInferenceConfiguration = PromptModelInferenceConfiguration;
  static PromptTemplateConfiguration = PromptTemplateConfiguration;
  static RerankingMetadataSelectiveModeConfiguration = RerankingMetadataSelectiveModeConfiguration;
  static RetrievalFlowNodeConfiguration = RetrievalFlowNodeConfiguration;
  static RetrievalFlowNodeS3Configuration = RetrievalFlowNodeS3Configuration;
  static RetrievalFlowNodeServiceConfiguration = RetrievalFlowNodeServiceConfiguration;
  static S3Location = S3Location;
  static StorageFlowNodeConfiguration = StorageFlowNodeConfiguration;
  static StorageFlowNodeS3Configuration = StorageFlowNodeS3Configuration;
  static StorageFlowNodeServiceConfiguration = StorageFlowNodeServiceConfiguration;
  static TextPromptTemplateConfiguration = TextPromptTemplateConfiguration;
  static VectorSearchBedrockRerankingConfiguration = VectorSearchBedrockRerankingConfiguration;
  static VectorSearchBedrockRerankingModelConfiguration = VectorSearchBedrockRerankingModelConfiguration;
  static VectorSearchRerankingConfiguration = VectorSearchRerankingConfiguration;
  constructor(properties: FlowProperties) {
    super('AWS::Bedrock::Flow', properties);
  }
}
