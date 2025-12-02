import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class TagItem {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: TagItem) {
    Object.assign(this, properties);
  }
}
export interface TrustedEntitySetProperties {
  Format: Value<string>;
  Activate?: Value<boolean>;
  DetectorId?: Value<string>;
  ExpectedBucketOwner?: Value<string>;
  Tags?: List<TagItem>;
  Name?: Value<string>;
  Location: Value<string>;
}
export default class TrustedEntitySet extends ResourceBase<TrustedEntitySetProperties> {
  static TagItem = TagItem;
  constructor(properties: TrustedEntitySetProperties) {
    super('AWS::GuardDuty::TrustedEntitySet', properties);
  }
}
