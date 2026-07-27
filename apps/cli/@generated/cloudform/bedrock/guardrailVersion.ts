import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface GuardrailVersionProperties {
  GuardrailIdentifier: Value<string>;
  Description?: Value<string>;
}
export default class GuardrailVersion extends ResourceBase<GuardrailVersionProperties> {
  constructor(properties: GuardrailVersionProperties) {
    super('AWS::Bedrock::GuardrailVersion', properties);
  }
}
