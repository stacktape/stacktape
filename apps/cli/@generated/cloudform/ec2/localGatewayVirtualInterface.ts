import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface LocalGatewayVirtualInterfaceProperties {
  OutpostLagId: Value<string>;
  LocalAddress: Value<string>;
  PeerAddress: Value<string>;
  Vlan: Value<number>;
  PeerBgpAsn?: Value<number>;
  Tags?: List<ResourceTag>;
  LocalGatewayVirtualInterfaceGroupId: Value<string>;
  PeerBgpAsnExtended?: Value<number>;
}
export default class LocalGatewayVirtualInterface extends ResourceBase<LocalGatewayVirtualInterfaceProperties> {
  constructor(properties: LocalGatewayVirtualInterfaceProperties) {
    super('AWS::EC2::LocalGatewayVirtualInterface', properties);
  }
}
