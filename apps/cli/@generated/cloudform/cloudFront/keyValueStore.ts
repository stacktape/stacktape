import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ImportSource {
  SourceArn!: Value<string>;
  SourceType!: Value<string>;
  constructor(properties: ImportSource) {
    Object.assign(this, properties);
  }
}
export interface KeyValueStoreProperties {
  Comment?: Value<string>;
  ImportSource?: ImportSource;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class KeyValueStore extends ResourceBase<KeyValueStoreProperties> {
  static ImportSource = ImportSource;
  constructor(properties: KeyValueStoreProperties) {
    super('AWS::CloudFront::KeyValueStore', properties);
  }
}
