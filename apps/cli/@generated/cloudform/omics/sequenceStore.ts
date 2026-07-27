import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class SseConfig {
  Type!: Value<string>;
  KeyArn?: Value<string>;
  constructor(properties: SseConfig) {
    Object.assign(this, properties);
  }
}
export interface SequenceStoreProperties {
  Description?: Value<string>;
  PropagatedSetLevelTags?: List<Value<string>>;
  FallbackLocation?: Value<string>;
  SseConfig?: SseConfig;
  AccessLogLocation?: Value<string>;
  ETagAlgorithmFamily?: Value<string>;
  S3AccessPolicy?: { [key: string]: any };
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class SequenceStore extends ResourceBase<SequenceStoreProperties> {
  static SseConfig = SseConfig;
  constructor(properties: SequenceStoreProperties) {
    super('AWS::Omics::SequenceStore', properties);
  }
}
