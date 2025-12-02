import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Tags {
  Value?: Value<string>;
  Key?: Value<string>;
  constructor(properties: Tags) {
    Object.assign(this, properties);
  }
}
export interface SdiSourceProperties {
  Type: Value<string>;
  Mode?: Value<string>;
  Tags?: List<Tags>;
  Name: Value<string>;
}
export default class SdiSource extends ResourceBase<SdiSourceProperties> {
  static Tags = Tags;
  constructor(properties: SdiSourceProperties) {
    super('AWS::MediaLive::SdiSource', properties);
  }
}
