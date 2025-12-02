import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class TagsEntry {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: TagsEntry) {
    Object.assign(this, properties);
  }
}
export interface RegistryProperties {
  Description?: Value<string>;
  RegistryName?: Value<string>;
  Tags?: List<TagsEntry>;
}
export default class Registry extends ResourceBase<RegistryProperties> {
  static TagsEntry = TagsEntry;
  constructor(properties?: RegistryProperties) {
    super('AWS::EventSchemas::Registry', properties || {});
  }
}
