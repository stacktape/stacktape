import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AIPromptTemplateConfiguration {
  TextFullAIPromptEditTemplateConfiguration!: TextFullAIPromptEditTemplateConfiguration;
  constructor(properties: AIPromptTemplateConfiguration) {
    Object.assign(this, properties);
  }
}

export class TextFullAIPromptEditTemplateConfiguration {
  Text!: Value<string>;
  constructor(properties: TextFullAIPromptEditTemplateConfiguration) {
    Object.assign(this, properties);
  }
}
export interface AIPromptProperties {
  Type: Value<string>;
  Description?: Value<string>;
  ApiFormat: Value<string>;
  AssistantId?: Value<string>;
  TemplateConfiguration: AIPromptTemplateConfiguration;
  TemplateType: Value<string>;
  ModelId: Value<string>;
  Tags?: { [key: string]: Value<string> };
  Name?: Value<string>;
}
export default class AIPrompt extends ResourceBase<AIPromptProperties> {
  static AIPromptTemplateConfiguration = AIPromptTemplateConfiguration;
  static TextFullAIPromptEditTemplateConfiguration = TextFullAIPromptEditTemplateConfiguration;
  constructor(properties: AIPromptProperties) {
    super('AWS::Wisdom::AIPrompt', properties);
  }
}
