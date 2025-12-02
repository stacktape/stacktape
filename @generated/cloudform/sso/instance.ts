import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface InstanceProperties {
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class Instance extends ResourceBase<InstanceProperties> {
  constructor(properties?: InstanceProperties) {
    super('AWS::SSO::Instance', properties || {});
  }
}
