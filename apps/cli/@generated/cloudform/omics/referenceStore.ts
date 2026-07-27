import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class SseConfig {
  Type!: Value<string>;
  KeyArn?: Value<string>;
  constructor(properties: SseConfig) {
    Object.assign(this, properties);
  }
}
export interface ReferenceStoreProperties {
  Description?: Value<string>;
  SseConfig?: SseConfig;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class ReferenceStore extends ResourceBase<ReferenceStoreProperties> {
  static SseConfig = SseConfig;
  constructor(properties: ReferenceStoreProperties) {
    super('AWS::Omics::ReferenceStore', properties);
  }
}
