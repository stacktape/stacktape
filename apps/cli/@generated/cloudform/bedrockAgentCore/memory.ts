import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ContentConfiguration {
  Type!: Value<string>;
  Level?: Value<string>;
  constructor(properties: ContentConfiguration) {
    Object.assign(this, properties);
  }
}

export class CustomConfigurationInput {
  SummaryOverride?: SummaryOverride;
  UserPreferenceOverride?: UserPreferenceOverride;
  EpisodicOverride?: EpisodicOverride;
  SemanticOverride?: SemanticOverride;
  SelfManagedConfiguration?: SelfManagedConfiguration;
  constructor(properties: CustomConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class CustomMemoryStrategy {
  Status?: Value<string>;
  Namespaces?: List<Value<string>>;
  NamespaceTemplates?: List<Value<string>>;
  Type?: Value<string>;
  Description?: Value<string>;
  Configuration?: CustomConfigurationInput;
  MemoryRecordSchema?: MemoryRecordSchema;
  CreatedAt?: Value<string>;
  StrategyId?: Value<string>;
  UpdatedAt?: Value<string>;
  Name!: Value<string>;
  constructor(properties: CustomMemoryStrategy) {
    Object.assign(this, properties);
  }
}

export class EpisodicMemoryStrategy {
  Status?: Value<string>;
  Namespaces?: List<Value<string>>;
  NamespaceTemplates?: List<Value<string>>;
  Type?: Value<string>;
  Description?: Value<string>;
  ReflectionConfiguration?: EpisodicReflectionConfigurationInput;
  MemoryRecordSchema?: MemoryRecordSchema;
  CreatedAt?: Value<string>;
  StrategyId?: Value<string>;
  UpdatedAt?: Value<string>;
  Name!: Value<string>;
  constructor(properties: EpisodicMemoryStrategy) {
    Object.assign(this, properties);
  }
}

export class EpisodicOverride {
  Consolidation?: EpisodicOverrideConsolidationConfigurationInput;
  Extraction?: EpisodicOverrideExtractionConfigurationInput;
  Reflection?: EpisodicOverrideReflectionConfigurationInput;
  constructor(properties: EpisodicOverride) {
    Object.assign(this, properties);
  }
}

export class EpisodicOverrideConsolidationConfigurationInput {
  AppendToPrompt!: Value<string>;
  ModelId!: Value<string>;
  constructor(properties: EpisodicOverrideConsolidationConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class EpisodicOverrideExtractionConfigurationInput {
  AppendToPrompt!: Value<string>;
  ModelId!: Value<string>;
  constructor(properties: EpisodicOverrideExtractionConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class EpisodicOverrideReflectionConfigurationInput {
  Namespaces?: List<Value<string>>;
  NamespaceTemplates?: List<Value<string>>;
  MemoryRecordSchema?: MemoryRecordSchema;
  AppendToPrompt!: Value<string>;
  ModelId!: Value<string>;
  constructor(properties: EpisodicOverrideReflectionConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class EpisodicReflectionConfigurationInput {
  Namespaces?: List<Value<string>>;
  NamespaceTemplates?: List<Value<string>>;
  MemoryRecordSchema?: MemoryRecordSchema;
  constructor(properties: EpisodicReflectionConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class ExtractionConfig {
  LlmExtractionConfig?: LlmExtractionConfig;
  constructor(properties: ExtractionConfig) {
    Object.assign(this, properties);
  }
}

export class IndexedKey {
  Type!: Value<string>;
  Key!: Value<string>;
  constructor(properties: IndexedKey) {
    Object.assign(this, properties);
  }
}

export class InvocationConfigurationInput {
  TopicArn?: Value<string>;
  PayloadDeliveryBucketName?: Value<string>;
  constructor(properties: InvocationConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class KinesisResource {
  DataStreamArn!: Value<string>;
  ContentConfigurations!: List<ContentConfiguration>;
  constructor(properties: KinesisResource) {
    Object.assign(this, properties);
  }
}

export class LlmExtractionConfig {
  Validation?: Validation;
  Definition!: Value<string>;
  LlmExtractionInstruction?: Value<string>;
  constructor(properties: LlmExtractionConfig) {
    Object.assign(this, properties);
  }
}

export class MemoryRecordSchema {
  MetadataSchema?: List<MetadataSchemaEntry>;
  constructor(properties: MemoryRecordSchema) {
    Object.assign(this, properties);
  }
}

export class MemoryStrategy {
  SummaryMemoryStrategy?: SummaryMemoryStrategy;
  CustomMemoryStrategy?: CustomMemoryStrategy;
  SemanticMemoryStrategy?: SemanticMemoryStrategy;
  UserPreferenceMemoryStrategy?: UserPreferenceMemoryStrategy;
  EpisodicMemoryStrategy?: EpisodicMemoryStrategy;
  constructor(properties: MemoryStrategy) {
    Object.assign(this, properties);
  }
}

export class MessageBasedTriggerInput {
  MessageCount?: Value<number>;
  constructor(properties: MessageBasedTriggerInput) {
    Object.assign(this, properties);
  }
}

export class MetadataSchemaEntry {
  Type?: Value<string>;
  ExtractionConfig?: ExtractionConfig;
  Key!: Value<string>;
  constructor(properties: MetadataSchemaEntry) {
    Object.assign(this, properties);
  }
}

export class NumberValidation {
  MinValue?: Value<number>;
  MaxValue?: Value<number>;
  constructor(properties: NumberValidation) {
    Object.assign(this, properties);
  }
}

export class SelfManagedConfiguration {
  TriggerConditions?: List<TriggerConditionInput>;
  InvocationConfiguration?: InvocationConfigurationInput;
  HistoricalContextWindowSize?: Value<number>;
  constructor(properties: SelfManagedConfiguration) {
    Object.assign(this, properties);
  }
}

export class SemanticMemoryStrategy {
  Status?: Value<string>;
  Namespaces?: List<Value<string>>;
  NamespaceTemplates?: List<Value<string>>;
  Type?: Value<string>;
  Description?: Value<string>;
  MemoryRecordSchema?: MemoryRecordSchema;
  CreatedAt?: Value<string>;
  StrategyId?: Value<string>;
  UpdatedAt?: Value<string>;
  Name!: Value<string>;
  constructor(properties: SemanticMemoryStrategy) {
    Object.assign(this, properties);
  }
}

export class SemanticOverride {
  Consolidation?: SemanticOverrideConsolidationConfigurationInput;
  Extraction?: SemanticOverrideExtractionConfigurationInput;
  constructor(properties: SemanticOverride) {
    Object.assign(this, properties);
  }
}

export class SemanticOverrideConsolidationConfigurationInput {
  AppendToPrompt!: Value<string>;
  ModelId!: Value<string>;
  constructor(properties: SemanticOverrideConsolidationConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class SemanticOverrideExtractionConfigurationInput {
  AppendToPrompt!: Value<string>;
  ModelId!: Value<string>;
  constructor(properties: SemanticOverrideExtractionConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class StreamDeliveryResource {
  Kinesis?: KinesisResource;
  constructor(properties: StreamDeliveryResource) {
    Object.assign(this, properties);
  }
}

export class StreamDeliveryResources {
  Resources!: List<StreamDeliveryResource>;
  constructor(properties: StreamDeliveryResources) {
    Object.assign(this, properties);
  }
}

export class StringListValidation {
  AllowedValues?: List<Value<string>>;
  MaxItems?: Value<number>;
  constructor(properties: StringListValidation) {
    Object.assign(this, properties);
  }
}

export class StringValidation {
  AllowedValues!: List<Value<string>>;
  constructor(properties: StringValidation) {
    Object.assign(this, properties);
  }
}

export class SummaryMemoryStrategy {
  Status?: Value<string>;
  Namespaces?: List<Value<string>>;
  NamespaceTemplates?: List<Value<string>>;
  Type?: Value<string>;
  Description?: Value<string>;
  MemoryRecordSchema?: MemoryRecordSchema;
  CreatedAt?: Value<string>;
  StrategyId?: Value<string>;
  UpdatedAt?: Value<string>;
  Name!: Value<string>;
  constructor(properties: SummaryMemoryStrategy) {
    Object.assign(this, properties);
  }
}

export class SummaryOverride {
  Consolidation?: SummaryOverrideConsolidationConfigurationInput;
  constructor(properties: SummaryOverride) {
    Object.assign(this, properties);
  }
}

export class SummaryOverrideConsolidationConfigurationInput {
  AppendToPrompt!: Value<string>;
  ModelId!: Value<string>;
  constructor(properties: SummaryOverrideConsolidationConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class TimeBasedTriggerInput {
  IdleSessionTimeout?: Value<number>;
  constructor(properties: TimeBasedTriggerInput) {
    Object.assign(this, properties);
  }
}

export class TokenBasedTriggerInput {
  TokenCount?: Value<number>;
  constructor(properties: TokenBasedTriggerInput) {
    Object.assign(this, properties);
  }
}

export class TriggerConditionInput {
  MessageBasedTrigger?: MessageBasedTriggerInput;
  TokenBasedTrigger?: TokenBasedTriggerInput;
  TimeBasedTrigger?: TimeBasedTriggerInput;
  constructor(properties: TriggerConditionInput) {
    Object.assign(this, properties);
  }
}

export class UserPreferenceMemoryStrategy {
  Status?: Value<string>;
  Namespaces?: List<Value<string>>;
  NamespaceTemplates?: List<Value<string>>;
  Type?: Value<string>;
  Description?: Value<string>;
  MemoryRecordSchema?: MemoryRecordSchema;
  CreatedAt?: Value<string>;
  StrategyId?: Value<string>;
  UpdatedAt?: Value<string>;
  Name!: Value<string>;
  constructor(properties: UserPreferenceMemoryStrategy) {
    Object.assign(this, properties);
  }
}

export class UserPreferenceOverride {
  Consolidation?: UserPreferenceOverrideConsolidationConfigurationInput;
  Extraction?: UserPreferenceOverrideExtractionConfigurationInput;
  constructor(properties: UserPreferenceOverride) {
    Object.assign(this, properties);
  }
}

export class UserPreferenceOverrideConsolidationConfigurationInput {
  AppendToPrompt!: Value<string>;
  ModelId!: Value<string>;
  constructor(properties: UserPreferenceOverrideConsolidationConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class UserPreferenceOverrideExtractionConfigurationInput {
  AppendToPrompt!: Value<string>;
  ModelId!: Value<string>;
  constructor(properties: UserPreferenceOverrideExtractionConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class Validation {
  StringValidation?: StringValidation;
  NumberValidation?: NumberValidation;
  StringListValidation?: StringListValidation;
  constructor(properties: Validation) {
    Object.assign(this, properties);
  }
}
export interface MemoryProperties {
  Description?: Value<string>;
  IndexedKeys?: List<IndexedKey>;
  EncryptionKeyArn?: Value<string>;
  MemoryExecutionRoleArn?: Value<string>;
  MemoryStrategies?: List<MemoryStrategy>;
  EventExpiryDuration: Value<number>;
  StreamDeliveryResources?: StreamDeliveryResources;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class Memory extends ResourceBase<MemoryProperties> {
  static ContentConfiguration = ContentConfiguration;
  static CustomConfigurationInput = CustomConfigurationInput;
  static CustomMemoryStrategy = CustomMemoryStrategy;
  static EpisodicMemoryStrategy = EpisodicMemoryStrategy;
  static EpisodicOverride = EpisodicOverride;
  static EpisodicOverrideConsolidationConfigurationInput = EpisodicOverrideConsolidationConfigurationInput;
  static EpisodicOverrideExtractionConfigurationInput = EpisodicOverrideExtractionConfigurationInput;
  static EpisodicOverrideReflectionConfigurationInput = EpisodicOverrideReflectionConfigurationInput;
  static EpisodicReflectionConfigurationInput = EpisodicReflectionConfigurationInput;
  static ExtractionConfig = ExtractionConfig;
  static IndexedKey = IndexedKey;
  static InvocationConfigurationInput = InvocationConfigurationInput;
  static KinesisResource = KinesisResource;
  static LlmExtractionConfig = LlmExtractionConfig;
  static MemoryRecordSchema = MemoryRecordSchema;
  static MemoryStrategy = MemoryStrategy;
  static MessageBasedTriggerInput = MessageBasedTriggerInput;
  static MetadataSchemaEntry = MetadataSchemaEntry;
  static NumberValidation = NumberValidation;
  static SelfManagedConfiguration = SelfManagedConfiguration;
  static SemanticMemoryStrategy = SemanticMemoryStrategy;
  static SemanticOverride = SemanticOverride;
  static SemanticOverrideConsolidationConfigurationInput = SemanticOverrideConsolidationConfigurationInput;
  static SemanticOverrideExtractionConfigurationInput = SemanticOverrideExtractionConfigurationInput;
  static StreamDeliveryResource = StreamDeliveryResource;
  static StreamDeliveryResources = StreamDeliveryResources;
  static StringListValidation = StringListValidation;
  static StringValidation = StringValidation;
  static SummaryMemoryStrategy = SummaryMemoryStrategy;
  static SummaryOverride = SummaryOverride;
  static SummaryOverrideConsolidationConfigurationInput = SummaryOverrideConsolidationConfigurationInput;
  static TimeBasedTriggerInput = TimeBasedTriggerInput;
  static TokenBasedTriggerInput = TokenBasedTriggerInput;
  static TriggerConditionInput = TriggerConditionInput;
  static UserPreferenceMemoryStrategy = UserPreferenceMemoryStrategy;
  static UserPreferenceOverride = UserPreferenceOverride;
  static UserPreferenceOverrideConsolidationConfigurationInput = UserPreferenceOverrideConsolidationConfigurationInput;
  static UserPreferenceOverrideExtractionConfigurationInput = UserPreferenceOverrideExtractionConfigurationInput;
  static Validation = Validation;
  constructor(properties: MemoryProperties) {
    super('AWS::BedrockAgentCore::Memory', properties);
  }
}
