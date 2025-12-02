import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ReferenceItem {
  ReferenceArn!: Value<string>;
  constructor(properties: ReferenceItem) {
    Object.assign(this, properties);
  }
}

export class SseConfig {
  Type!: Value<string>;
  KeyArn?: Value<string>;
  constructor(properties: SseConfig) {
    Object.assign(this, properties);
  }
}
export interface VariantStoreProperties {
  Description?: Value<string>;
  Reference: ReferenceItem;
  SseConfig?: SseConfig;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class VariantStore extends ResourceBase<VariantStoreProperties> {
  static ReferenceItem = ReferenceItem;
  static SseConfig = SseConfig;
  constructor(properties: VariantStoreProperties) {
    super('AWS::Omics::VariantStore', properties);
  }
}
