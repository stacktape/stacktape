import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface AccessorProperties {
  NetworkType?: Value<string>;
  Tags?: List<ResourceTag>;
  AccessorType: Value<string>;
}
export default class Accessor extends ResourceBase<AccessorProperties> {
  constructor(properties: AccessorProperties) {
    super('AWS::ManagedBlockchain::Accessor', properties);
  }
}
