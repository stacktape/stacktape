import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Tags {
  Value?: Value<string>;
  Key?: Value<string>;
  constructor(properties: Tags) {
    Object.assign(this, properties);
  }
}
export interface ChannelPlacementGroupProperties {
  ClusterId?: Value<string>;
  Nodes?: List<Value<string>>;
  Tags?: List<Tags>;
  Name?: Value<string>;
}
export default class ChannelPlacementGroup extends ResourceBase<ChannelPlacementGroupProperties> {
  static Tags = Tags;
  constructor(properties?: ChannelPlacementGroupProperties) {
    super('AWS::MediaLive::ChannelPlacementGroup', properties || {});
  }
}
