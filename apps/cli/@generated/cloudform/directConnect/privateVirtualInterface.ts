import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BgpPeer {
  BgpPeerId?: Value<string>;
  AuthKey?: Value<string>;
  AddressFamily!: Value<string>;
  AmazonAddress?: Value<string>;
  Asn!: Value<string>;
  CustomerAddress?: Value<string>;
  constructor(properties: BgpPeer) {
    Object.assign(this, properties);
  }
}
export interface PrivateVirtualInterfaceProperties {
  BgpPeers: List<BgpPeer>;
  ConnectionId: Value<string>;
  AllocatePrivateVirtualInterfaceRoleArn?: Value<string>;
  DirectConnectGatewayId?: Value<string>;
  EnableSiteLink?: Value<boolean>;
  VirtualInterfaceName: Value<string>;
  Vlan: Value<number>;
  VirtualGatewayId?: Value<string>;
  Tags?: List<ResourceTag>;
  Mtu?: Value<number>;
}
export default class PrivateVirtualInterface extends ResourceBase<PrivateVirtualInterfaceProperties> {
  static BgpPeer = BgpPeer;
  constructor(properties: PrivateVirtualInterfaceProperties) {
    super('AWS::DirectConnect::PrivateVirtualInterface', properties);
  }
}
