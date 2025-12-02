import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CloudFormationCollectionFilter {
  StackNames?: List<Value<string>>;
  constructor(properties: CloudFormationCollectionFilter) {
    Object.assign(this, properties);
  }
}

export class ResourceCollectionFilter {
  CloudFormation?: CloudFormationCollectionFilter;
  Tags?: List<TagCollection>;
  constructor(properties: ResourceCollectionFilter) {
    Object.assign(this, properties);
  }
}

export class TagCollection {
  AppBoundaryKey?: Value<string>;
  TagValues?: List<Value<string>>;
  constructor(properties: TagCollection) {
    Object.assign(this, properties);
  }
}
export interface ResourceCollectionProperties {
  ResourceCollectionFilter: ResourceCollectionFilter;
}
export default class ResourceCollection extends ResourceBase<ResourceCollectionProperties> {
  static CloudFormationCollectionFilter = CloudFormationCollectionFilter;
  static ResourceCollectionFilter = ResourceCollectionFilter;
  static TagCollection = TagCollection;
  constructor(properties: ResourceCollectionProperties) {
    super('AWS::DevOpsGuru::ResourceCollection', properties);
  }
}
