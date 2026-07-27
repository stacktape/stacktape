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

export class StoreOptions {
  TsvStoreOptions!: TsvStoreOptions;
  constructor(properties: StoreOptions) {
    Object.assign(this, properties);
  }
}

export class TsvStoreOptions {
  Schema?: { [key: string]: any };
  FormatToHeader?: { [key: string]: Value<string> };
  AnnotationType?: Value<string>;
  constructor(properties: TsvStoreOptions) {
    Object.assign(this, properties);
  }
}
export interface AnnotationStoreProperties {
  StoreFormat: Value<string>;
  Description?: Value<string>;
  Reference?: ReferenceItem;
  SseConfig?: SseConfig;
  StoreOptions?: StoreOptions;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class AnnotationStore extends ResourceBase<AnnotationStoreProperties> {
  static ReferenceItem = ReferenceItem;
  static SseConfig = SseConfig;
  static StoreOptions = StoreOptions;
  static TsvStoreOptions = TsvStoreOptions;
  constructor(properties: AnnotationStoreProperties) {
    super('AWS::Omics::AnnotationStore', properties);
  }
}
