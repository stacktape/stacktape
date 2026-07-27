import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ConfigurationItem {
  Type?: Value<string>;
  Parameters?: List<ConfigurationParameter>;
  constructor(properties: ConfigurationItem) {
    Object.assign(this, properties);
  }
}

export class ConfigurationParameter {
  Values?: List<Value<string>>;
  Name?: Value<string>;
  constructor(properties: ConfigurationParameter) {
    Object.assign(this, properties);
  }
}

export class Query {
  TagFilters?: List<TagFilter>;
  ResourceTypeFilters?: List<Value<string>>;
  StackIdentifier?: Value<string>;
  constructor(properties: Query) {
    Object.assign(this, properties);
  }
}

export class ResourceQuery {
  Type?: Value<string>;
  Query?: Query;
  constructor(properties: ResourceQuery) {
    Object.assign(this, properties);
  }
}

export class TagFilter {
  Values?: List<Value<string>>;
  Key?: Value<string>;
  constructor(properties: TagFilter) {
    Object.assign(this, properties);
  }
}
export interface GroupProperties {
  Description?: Value<string>;
  Configuration?: List<ConfigurationItem>;
  ResourceQuery?: ResourceQuery;
  Resources?: List<Value<string>>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Group extends ResourceBase<GroupProperties> {
  static ConfigurationItem = ConfigurationItem;
  static ConfigurationParameter = ConfigurationParameter;
  static Query = Query;
  static ResourceQuery = ResourceQuery;
  static TagFilter = TagFilter;
  constructor(properties: GroupProperties) {
    super('AWS::ResourceGroups::Group', properties);
  }
}
