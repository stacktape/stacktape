import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AIGuardrailContentPolicyConfig {
  FiltersConfig!: List<GuardrailContentFilterConfig>;
  constructor(properties: AIGuardrailContentPolicyConfig) {
    Object.assign(this, properties);
  }
}

export class AIGuardrailContextualGroundingPolicyConfig {
  FiltersConfig!: List<GuardrailContextualGroundingFilterConfig>;
  constructor(properties: AIGuardrailContextualGroundingPolicyConfig) {
    Object.assign(this, properties);
  }
}

export class AIGuardrailSensitiveInformationPolicyConfig {
  RegexesConfig?: List<GuardrailRegexConfig>;
  PiiEntitiesConfig?: List<GuardrailPiiEntityConfig>;
  constructor(properties: AIGuardrailSensitiveInformationPolicyConfig) {
    Object.assign(this, properties);
  }
}

export class AIGuardrailTopicPolicyConfig {
  TopicsConfig!: List<GuardrailTopicConfig>;
  constructor(properties: AIGuardrailTopicPolicyConfig) {
    Object.assign(this, properties);
  }
}

export class AIGuardrailWordPolicyConfig {
  ManagedWordListsConfig?: List<GuardrailManagedWordsConfig>;
  WordsConfig?: List<GuardrailWordConfig>;
  constructor(properties: AIGuardrailWordPolicyConfig) {
    Object.assign(this, properties);
  }
}

export class GuardrailContentFilterConfig {
  OutputStrength!: Value<string>;
  Type!: Value<string>;
  InputStrength!: Value<string>;
  constructor(properties: GuardrailContentFilterConfig) {
    Object.assign(this, properties);
  }
}

export class GuardrailContextualGroundingFilterConfig {
  Type!: Value<string>;
  Threshold!: Value<number>;
  constructor(properties: GuardrailContextualGroundingFilterConfig) {
    Object.assign(this, properties);
  }
}

export class GuardrailManagedWordsConfig {
  Type!: Value<string>;
  constructor(properties: GuardrailManagedWordsConfig) {
    Object.assign(this, properties);
  }
}

export class GuardrailPiiEntityConfig {
  Type!: Value<string>;
  Action!: Value<string>;
  constructor(properties: GuardrailPiiEntityConfig) {
    Object.assign(this, properties);
  }
}

export class GuardrailRegexConfig {
  Pattern!: Value<string>;
  Action!: Value<string>;
  Description?: Value<string>;
  Name!: Value<string>;
  constructor(properties: GuardrailRegexConfig) {
    Object.assign(this, properties);
  }
}

export class GuardrailTopicConfig {
  Type!: Value<string>;
  Definition!: Value<string>;
  Examples?: List<Value<string>>;
  Name!: Value<string>;
  constructor(properties: GuardrailTopicConfig) {
    Object.assign(this, properties);
  }
}

export class GuardrailWordConfig {
  Text!: Value<string>;
  constructor(properties: GuardrailWordConfig) {
    Object.assign(this, properties);
  }
}
export interface AIGuardrailProperties {
  TopicPolicyConfig?: AIGuardrailTopicPolicyConfig;
  Description?: Value<string>;
  WordPolicyConfig?: AIGuardrailWordPolicyConfig;
  ContextualGroundingPolicyConfig?: AIGuardrailContextualGroundingPolicyConfig;
  BlockedInputMessaging: Value<string>;
  AssistantId: Value<string>;
  BlockedOutputsMessaging: Value<string>;
  SensitiveInformationPolicyConfig?: AIGuardrailSensitiveInformationPolicyConfig;
  ContentPolicyConfig?: AIGuardrailContentPolicyConfig;
  Tags?: { [key: string]: Value<string> };
  Name?: Value<string>;
}
export default class AIGuardrail extends ResourceBase<AIGuardrailProperties> {
  static AIGuardrailContentPolicyConfig = AIGuardrailContentPolicyConfig;
  static AIGuardrailContextualGroundingPolicyConfig = AIGuardrailContextualGroundingPolicyConfig;
  static AIGuardrailSensitiveInformationPolicyConfig = AIGuardrailSensitiveInformationPolicyConfig;
  static AIGuardrailTopicPolicyConfig = AIGuardrailTopicPolicyConfig;
  static AIGuardrailWordPolicyConfig = AIGuardrailWordPolicyConfig;
  static GuardrailContentFilterConfig = GuardrailContentFilterConfig;
  static GuardrailContextualGroundingFilterConfig = GuardrailContextualGroundingFilterConfig;
  static GuardrailManagedWordsConfig = GuardrailManagedWordsConfig;
  static GuardrailPiiEntityConfig = GuardrailPiiEntityConfig;
  static GuardrailRegexConfig = GuardrailRegexConfig;
  static GuardrailTopicConfig = GuardrailTopicConfig;
  static GuardrailWordConfig = GuardrailWordConfig;
  constructor(properties: AIGuardrailProperties) {
    super('AWS::Wisdom::AIGuardrail', properties);
  }
}
