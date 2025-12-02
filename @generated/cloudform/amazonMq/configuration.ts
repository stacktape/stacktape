import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class TagsEntry {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: TagsEntry) {
    Object.assign(this, properties);
  }
}
export interface ConfigurationProperties {
  EngineVersion?: Value<string>;
  Description?: Value<string>;
  AuthenticationStrategy?: Value<string>;
  EngineType: Value<string>;
  Data?: Value<string>;
  Tags?: List<TagsEntry>;
  Name: Value<string>;
}
export default class Configuration extends ResourceBase<ConfigurationProperties> {
  static TagsEntry = TagsEntry;
  constructor(properties: ConfigurationProperties) {
    super('AWS::AmazonMQ::Configuration', properties);
  }
}
