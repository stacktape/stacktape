import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AutomatedReasoningPolicyConfig {
  Policies!: List<Value<string>>;
  ConfidenceThreshold?: Value<number>;
  constructor(properties: AutomatedReasoningPolicyConfig) {
    Object.assign(this, properties);
  }
}

export class ContentFilterConfig {
  OutputStrength!: Value<string>;
  Type!: Value<string>;
  InputEnabled?: Value<boolean>;
  InputAction?: Value<string>;
  OutputAction?: Value<string>;
  InputStrength!: Value<string>;
  InputModalities?: List<Value<string>>;
  OutputEnabled?: Value<boolean>;
  OutputModalities?: List<Value<string>>;
  constructor(properties: ContentFilterConfig) {
    Object.assign(this, properties);
  }
}

export class ContentFiltersTierConfig {
  TierName!: Value<string>;
  constructor(properties: ContentFiltersTierConfig) {
    Object.assign(this, properties);
  }
}

export class ContentPolicyConfig {
  ContentFiltersTierConfig?: ContentFiltersTierConfig;
  FiltersConfig!: List<ContentFilterConfig>;
  constructor(properties: ContentPolicyConfig) {
    Object.assign(this, properties);
  }
}

export class ContextualGroundingFilterConfig {
  Type!: Value<string>;
  Action?: Value<string>;
  Enabled?: Value<boolean>;
  Threshold!: Value<number>;
  constructor(properties: ContextualGroundingFilterConfig) {
    Object.assign(this, properties);
  }
}

export class ContextualGroundingPolicyConfig {
  FiltersConfig!: List<ContextualGroundingFilterConfig>;
  constructor(properties: ContextualGroundingPolicyConfig) {
    Object.assign(this, properties);
  }
}

export class GuardrailCrossRegionConfig {
  GuardrailProfileArn!: Value<string>;
  constructor(properties: GuardrailCrossRegionConfig) {
    Object.assign(this, properties);
  }
}

export class ManagedWordsConfig {
  Type!: Value<string>;
  InputEnabled?: Value<boolean>;
  InputAction?: Value<string>;
  OutputAction?: Value<string>;
  OutputEnabled?: Value<boolean>;
  constructor(properties: ManagedWordsConfig) {
    Object.assign(this, properties);
  }
}

export class PiiEntityConfig {
  Type!: Value<string>;
  Action!: Value<string>;
  InputEnabled?: Value<boolean>;
  InputAction?: Value<string>;
  OutputAction?: Value<string>;
  OutputEnabled?: Value<boolean>;
  constructor(properties: PiiEntityConfig) {
    Object.assign(this, properties);
  }
}

export class RegexConfig {
  Pattern!: Value<string>;
  Action!: Value<string>;
  InputEnabled?: Value<boolean>;
  Description?: Value<string>;
  InputAction?: Value<string>;
  OutputAction?: Value<string>;
  OutputEnabled?: Value<boolean>;
  Name!: Value<string>;
  constructor(properties: RegexConfig) {
    Object.assign(this, properties);
  }
}

export class SensitiveInformationPolicyConfig {
  RegexesConfig?: List<RegexConfig>;
  PiiEntitiesConfig?: List<PiiEntityConfig>;
  constructor(properties: SensitiveInformationPolicyConfig) {
    Object.assign(this, properties);
  }
}

export class TopicConfig {
  Type!: Value<string>;
  InputEnabled?: Value<boolean>;
  InputAction?: Value<string>;
  OutputAction?: Value<string>;
  Definition!: Value<string>;
  OutputEnabled?: Value<boolean>;
  Examples?: List<Value<string>>;
  Name!: Value<string>;
  constructor(properties: TopicConfig) {
    Object.assign(this, properties);
  }
}

export class TopicPolicyConfig {
  TopicsTierConfig?: TopicsTierConfig;
  TopicsConfig!: List<TopicConfig>;
  constructor(properties: TopicPolicyConfig) {
    Object.assign(this, properties);
  }
}

export class TopicsTierConfig {
  TierName!: Value<string>;
  constructor(properties: TopicsTierConfig) {
    Object.assign(this, properties);
  }
}

export class WordConfig {
  InputEnabled?: Value<boolean>;
  InputAction?: Value<string>;
  OutputAction?: Value<string>;
  OutputEnabled?: Value<boolean>;
  Text!: Value<string>;
  constructor(properties: WordConfig) {
    Object.assign(this, properties);
  }
}

export class WordPolicyConfig {
  ManagedWordListsConfig?: List<ManagedWordsConfig>;
  WordsConfig?: List<WordConfig>;
  constructor(properties: WordPolicyConfig) {
    Object.assign(this, properties);
  }
}
export interface GuardrailProperties {
  TopicPolicyConfig?: TopicPolicyConfig;
  Description?: Value<string>;
  CrossRegionConfig?: GuardrailCrossRegionConfig;
  Name: Value<string>;
  WordPolicyConfig?: WordPolicyConfig;
  ContextualGroundingPolicyConfig?: ContextualGroundingPolicyConfig;
  KmsKeyArn?: Value<string>;
  BlockedInputMessaging: Value<string>;
  BlockedOutputsMessaging: Value<string>;
  SensitiveInformationPolicyConfig?: SensitiveInformationPolicyConfig;
  ContentPolicyConfig?: ContentPolicyConfig;
  Tags?: List<ResourceTag>;
  AutomatedReasoningPolicyConfig?: AutomatedReasoningPolicyConfig;
}
export default class Guardrail extends ResourceBase<GuardrailProperties> {
  static AutomatedReasoningPolicyConfig = AutomatedReasoningPolicyConfig;
  static ContentFilterConfig = ContentFilterConfig;
  static ContentFiltersTierConfig = ContentFiltersTierConfig;
  static ContentPolicyConfig = ContentPolicyConfig;
  static ContextualGroundingFilterConfig = ContextualGroundingFilterConfig;
  static ContextualGroundingPolicyConfig = ContextualGroundingPolicyConfig;
  static GuardrailCrossRegionConfig = GuardrailCrossRegionConfig;
  static ManagedWordsConfig = ManagedWordsConfig;
  static PiiEntityConfig = PiiEntityConfig;
  static RegexConfig = RegexConfig;
  static SensitiveInformationPolicyConfig = SensitiveInformationPolicyConfig;
  static TopicConfig = TopicConfig;
  static TopicPolicyConfig = TopicPolicyConfig;
  static TopicsTierConfig = TopicsTierConfig;
  static WordConfig = WordConfig;
  static WordPolicyConfig = WordPolicyConfig;
  constructor(properties: GuardrailProperties) {
    super('AWS::Bedrock::Guardrail', properties);
  }
}
