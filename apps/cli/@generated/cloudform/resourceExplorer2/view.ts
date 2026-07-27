import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IncludedProperty {
  Name!: Value<string>;
  constructor(properties: IncludedProperty) {
    Object.assign(this, properties);
  }
}

export class SearchFilter {
  FilterString!: Value<string>;
  constructor(properties: SearchFilter) {
    Object.assign(this, properties);
  }
}
export interface ViewProperties {
  Filters?: SearchFilter;
  Scope?: Value<string>;
  IncludedProperties?: List<IncludedProperty>;
  Tags?: { [key: string]: Value<string> };
  ViewName: Value<string>;
}
export default class View extends ResourceBase<ViewProperties> {
  static IncludedProperty = IncludedProperty;
  static SearchFilter = SearchFilter;
  constructor(properties: ViewProperties) {
    super('AWS::ResourceExplorer2::View', properties);
  }
}
