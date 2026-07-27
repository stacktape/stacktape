import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class LinkConfiguration {
  LogGroupConfiguration?: LinkFilter;
  MetricConfiguration?: LinkFilter;
  constructor(properties: LinkConfiguration) {
    Object.assign(this, properties);
  }
}

export class LinkFilter {
  Filter!: Value<string>;
  constructor(properties: LinkFilter) {
    Object.assign(this, properties);
  }
}
export interface LinkProperties {
  SinkIdentifier: Value<string>;
  LabelTemplate?: Value<string>;
  ResourceTypes: List<Value<string>>;
  LinkConfiguration?: LinkConfiguration;
  Tags?: { [key: string]: Value<string> };
}
export default class Link extends ResourceBase<LinkProperties> {
  static LinkConfiguration = LinkConfiguration;
  static LinkFilter = LinkFilter;
  constructor(properties: LinkProperties) {
    super('AWS::Oam::Link', properties);
  }
}
