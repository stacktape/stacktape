import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface WaitConditionHandleProperties {}
export default class WaitConditionHandle extends ResourceBase<WaitConditionHandleProperties> {
  constructor(properties?: WaitConditionHandleProperties) {
    super('AWS::CloudFormation::WaitConditionHandle', properties || {});
  }
}
