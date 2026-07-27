import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class TransitGatewayAttachmentBgpConfiguration {
  TransitGatewayAddress?: Value<string>;
  PeerAddress?: Value<string>;
  BgpStatus?: Value<string>;
  PeerAsn?: Value<number>;
  TransitGatewayAsn?: Value<number>;
  constructor(properties: TransitGatewayAttachmentBgpConfiguration) {
    Object.assign(this, properties);
  }
}

export class TransitGatewayConnectPeerConfiguration {
  TransitGatewayAddress?: Value<string>;
  BgpConfigurations?: List<TransitGatewayAttachmentBgpConfiguration>;
  PeerAddress!: Value<string>;
  InsideCidrBlocks!: List<Value<string>>;
  Protocol?: Value<string>;
  constructor(properties: TransitGatewayConnectPeerConfiguration) {
    Object.assign(this, properties);
  }
}
export interface TransitGatewayConnectPeerProperties {
  ConnectPeerConfiguration: TransitGatewayConnectPeerConfiguration;
  Tags?: List<ResourceTag>;
  TransitGatewayAttachmentId: Value<string>;
}
export default class TransitGatewayConnectPeer extends ResourceBase<TransitGatewayConnectPeerProperties> {
  static TransitGatewayAttachmentBgpConfiguration = TransitGatewayAttachmentBgpConfiguration;
  static TransitGatewayConnectPeerConfiguration = TransitGatewayConnectPeerConfiguration;
  constructor(properties: TransitGatewayConnectPeerProperties) {
    super('AWS::EC2::TransitGatewayConnectPeer', properties);
  }
}
