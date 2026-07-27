import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface AIAgentVersionProperties {
  AssistantId: Value<string>;
  AIAgentId: Value<string>;
  ModifiedTimeSeconds?: Value<number>;
}
export default class AIAgentVersion extends ResourceBase<AIAgentVersionProperties> {
  constructor(properties: AIAgentVersionProperties) {
    super('AWS::Wisdom::AIAgentVersion', properties);
  }
}
