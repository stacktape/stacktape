import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class KeyGroupConfig {
  Comment?: Value<string>;
  Items!: List<Value<string>>;
  Name!: Value<string>;
  constructor(properties: KeyGroupConfig) {
    Object.assign(this, properties);
  }
}
export interface KeyGroupProperties {
  KeyGroupConfig: KeyGroupConfig;
}
export default class KeyGroup extends ResourceBase<KeyGroupProperties> {
  static KeyGroupConfig = KeyGroupConfig;
  constructor(properties: KeyGroupProperties) {
    super('AWS::CloudFront::KeyGroup', properties);
  }
}
