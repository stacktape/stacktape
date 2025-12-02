import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ResourceProperties {
  ResourceArn: Value<string>;
  WithFederation?: Value<boolean>;
  UseServiceLinkedRole: Value<boolean>;
  HybridAccessEnabled?: Value<boolean>;
  RoleArn?: Value<string>;
}
export default class Resource extends ResourceBase<ResourceProperties> {
  constructor(properties: ResourceProperties) {
    super('AWS::LakeFormation::Resource', properties);
  }
}
