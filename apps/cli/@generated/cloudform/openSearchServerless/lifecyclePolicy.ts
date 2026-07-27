import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface LifecyclePolicyProperties {
  Policy: Value<string>;
  Type: Value<string>;
  Description?: Value<string>;
  Name: Value<string>;
}
export default class LifecyclePolicy extends ResourceBase<LifecyclePolicyProperties> {
  constructor(properties: LifecyclePolicyProperties) {
    super('AWS::OpenSearchServerless::LifecyclePolicy', properties);
  }
}
