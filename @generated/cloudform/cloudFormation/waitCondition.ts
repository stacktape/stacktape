import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface WaitConditionProperties {
  Count?: Value<number>;
  Handle?: Value<string>;
  Timeout?: Value<string>;
}
export default class WaitCondition extends ResourceBase<WaitConditionProperties> {
  constructor(properties?: WaitConditionProperties) {
    super('AWS::CloudFormation::WaitCondition', properties || {});
  }
}
