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
export interface PublicVirtualInterfaceProperties {
  BgpPeers: List<BgpPeer>;
  ConnectionId: Value<string>;
  RouteFilterPrefixes?: List<Value<string>>;
  VirtualInterfaceName: Value<string>;
  Vlan: Value<number>;
  Tags?: List<ResourceTag>;
  AllocatePublicVirtualInterfaceRoleArn?: Value<string>;
}
export default class PublicVirtualInterface extends ResourceBase<PublicVirtualInterfaceProperties> {
  static BgpPeer = BgpPeer;
  constructor(properties: PublicVirtualInterfaceProperties) {
    super('AWS::DirectConnect::PublicVirtualInterface', properties);
  }
}
