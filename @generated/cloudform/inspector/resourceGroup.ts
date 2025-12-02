import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface ResourceGroupProperties {
  ResourceGroupTags: List<ResourceTag>;
}
export default class ResourceGroup extends ResourceBase<ResourceGroupProperties> {
  constructor(properties: ResourceGroupProperties) {
    super('AWS::Inspector::ResourceGroup', properties);
  }
}
