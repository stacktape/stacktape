import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CFNDestinationProperties {
  KmsKeyArn?: Value<string>;
  DestinationArn?: Value<string>;
  constructor(properties: CFNDestinationProperties) {
    Object.assign(this, properties);
  }
}

export class TagItem {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: TagItem) {
    Object.assign(this, properties);
  }
}
export interface PublishingDestinationProperties {
  DestinationProperties: CFNDestinationProperties;
  DetectorId: Value<string>;
  DestinationType: Value<string>;
  Tags?: List<TagItem>;
}
export default class PublishingDestination extends ResourceBase<PublishingDestinationProperties> {
  static CFNDestinationProperties = CFNDestinationProperties;
  static TagItem = TagItem;
  constructor(properties: PublishingDestinationProperties) {
    super('AWS::GuardDuty::PublishingDestination', properties);
  }
}
