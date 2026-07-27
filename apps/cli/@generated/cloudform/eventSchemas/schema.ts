import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class TagsEntry {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: TagsEntry) {
    Object.assign(this, properties);
  }
}
export interface SchemaProperties {
  Type: Value<string>;
  Description?: Value<string>;
  Content: Value<string>;
  RegistryName: Value<string>;
  SchemaName?: Value<string>;
  Tags?: List<TagsEntry>;
}
export default class Schema extends ResourceBase<SchemaProperties> {
  static TagsEntry = TagsEntry;
  constructor(properties: SchemaProperties) {
    super('AWS::EventSchemas::Schema', properties);
  }
}
