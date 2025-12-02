import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class PeeringAttachmentStatus {
  Message?: Value<string>;
  Code?: Value<string>;
  constructor(properties: PeeringAttachmentStatus) {
    Object.assign(this, properties);
  }
}
export interface TransitGatewayPeeringAttachmentProperties {
  TransitGatewayId: Value<string>;
  PeerTransitGatewayId: Value<string>;
  PeerAccountId: Value<string>;
  PeerRegion: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class TransitGatewayPeeringAttachment extends ResourceBase<TransitGatewayPeeringAttachmentProperties> {
  static PeeringAttachmentStatus = PeeringAttachmentStatus;
  constructor(properties: TransitGatewayPeeringAttachmentProperties) {
    super('AWS::EC2::TransitGatewayPeeringAttachment', properties);
  }
}
