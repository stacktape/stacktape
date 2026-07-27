import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class TagItem {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: TagItem) {
    Object.assign(this, properties);
  }
}
export interface ThreatIntelSetProperties {
  Format: Value<string>;
  Activate?: Value<boolean>;
  DetectorId?: Value<string>;
  ExpectedBucketOwner?: Value<string>;
  Tags?: List<TagItem>;
  Name?: Value<string>;
  Location: Value<string>;
}
export default class ThreatIntelSet extends ResourceBase<ThreatIntelSetProperties> {
  static TagItem = TagItem;
  constructor(properties: ThreatIntelSetProperties) {
    super('AWS::GuardDuty::ThreatIntelSet', properties);
  }
}
