import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface LimitProperties {
  Description?: Value<string>;
  AmountRequirementName: Value<string>;
  DisplayName: Value<string>;
  MaxCount: Value<number>;
  FarmId: Value<string>;
}
export default class Limit extends ResourceBase<LimitProperties> {
  constructor(properties: LimitProperties) {
    super('AWS::Deadline::Limit', properties);
  }
}
