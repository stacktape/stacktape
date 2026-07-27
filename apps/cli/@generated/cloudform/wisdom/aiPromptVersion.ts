import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface AIPromptVersionProperties {
  AssistantId: Value<string>;
  ModifiedTimeSeconds?: Value<number>;
  AIPromptId: Value<string>;
}
export default class AIPromptVersion extends ResourceBase<AIPromptVersionProperties> {
  constructor(properties: AIPromptVersionProperties) {
    super('AWS::Wisdom::AIPromptVersion', properties);
  }
}
