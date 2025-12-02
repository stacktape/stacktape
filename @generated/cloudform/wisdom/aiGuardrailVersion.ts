import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface AIGuardrailVersionProperties {
  AIGuardrailId: Value<string>;
  AssistantId: Value<string>;
  ModifiedTimeSeconds?: Value<number>;
}
export default class AIGuardrailVersion extends ResourceBase<AIGuardrailVersionProperties> {
  constructor(properties: AIGuardrailVersionProperties) {
    super('AWS::Wisdom::AIGuardrailVersion', properties);
  }
}
