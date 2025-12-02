import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CustomConfigurationInput {
  SummaryOverride?: SummaryOverride;
  UserPreferenceOverride?: UserPreferenceOverride;
  SemanticOverride?: SemanticOverride;
  SelfManagedConfiguration?: SelfManagedConfiguration;
  constructor(properties: CustomConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class CustomMemoryStrategy {
  Status?: Value<string>;
  Namespaces?: List<Value<string>>;
  Type?: Value<string>;
  Description?: Value<string>;
  Configuration?: CustomConfigurationInput;
  CreatedAt?: Value<string>;
  StrategyId?: Value<string>;
  UpdatedAt?: Value<string>;
  Name!: Value<string>;
  constructor(properties: CustomMemoryStrategy) {
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

export class MemoryStrategy {
  SummaryMemoryStrategy?: SummaryMemoryStrategy;
  CustomMemoryStrategy?: CustomMemoryStrategy;
  SemanticMemoryStrategy?: SemanticMemoryStrategy;
  UserPreferenceMemoryStrategy?: UserPreferenceMemoryStrategy;
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
  Type?: Value<string>;
  Description?: Value<string>;
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

export class SummaryMemoryStrategy {
  Status?: Value<string>;
  Namespaces?: List<Value<string>>;
  Type?: Value<string>;
  Description?: Value<string>;
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
  Type?: Value<string>;
  Description?: Value<string>;
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
export interface MemoryProperties {
  Description?: Value<string>;
  EncryptionKeyArn?: Value<string>;
  MemoryExecutionRoleArn?: Value<string>;
  MemoryStrategies?: List<MemoryStrategy>;
  EventExpiryDuration: Value<number>;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class Memory extends ResourceBase<MemoryProperties> {
  static CustomConfigurationInput = CustomConfigurationInput;
  static CustomMemoryStrategy = CustomMemoryStrategy;
  static InvocationConfigurationInput = InvocationConfigurationInput;
  static MemoryStrategy = MemoryStrategy;
  static MessageBasedTriggerInput = MessageBasedTriggerInput;
  static SelfManagedConfiguration = SelfManagedConfiguration;
  static SemanticMemoryStrategy = SemanticMemoryStrategy;
  static SemanticOverride = SemanticOverride;
  static SemanticOverrideConsolidationConfigurationInput = SemanticOverrideConsolidationConfigurationInput;
  static SemanticOverrideExtractionConfigurationInput = SemanticOverrideExtractionConfigurationInput;
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
  constructor(properties: MemoryProperties) {
    super('AWS::BedrockAgentCore::Memory', properties);
  }
}
