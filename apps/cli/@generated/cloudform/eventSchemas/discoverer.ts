import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class TagsEntry {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: TagsEntry) {
    Object.assign(this, properties);
  }
}
export interface DiscovererProperties {
  CrossAccount?: Value<boolean>;
  Description?: Value<string>;
  SourceArn: Value<string>;
  Tags?: List<TagsEntry>;
}
export default class Discoverer extends ResourceBase<DiscovererProperties> {
  static TagsEntry = TagsEntry;
  constructor(properties: DiscovererProperties) {
    super('AWS::EventSchemas::Discoverer', properties);
  }
}
