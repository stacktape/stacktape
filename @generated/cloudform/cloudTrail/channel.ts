import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Destination {
  Type!: Value<string>;
  Location!: Value<string>;
  constructor(properties: Destination) {
    Object.assign(this, properties);
  }
}
export interface ChannelProperties {
  Destinations?: List<Destination>;
  Source?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class Channel extends ResourceBase<ChannelProperties> {
  static Destination = Destination;
  constructor(properties?: ChannelProperties) {
    super('AWS::CloudTrail::Channel', properties || {});
  }
}
