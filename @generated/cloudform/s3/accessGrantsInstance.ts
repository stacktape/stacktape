import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface AccessGrantsInstanceProperties {
  IdentityCenterArn?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class AccessGrantsInstance extends ResourceBase<AccessGrantsInstanceProperties> {
  constructor(properties?: AccessGrantsInstanceProperties) {
    super('AWS::S3::AccessGrantsInstance', properties || {});
  }
}
