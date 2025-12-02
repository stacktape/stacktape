import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface LocalGatewayVirtualInterfaceGroupProperties {
  LocalGatewayId: Value<string>;
  LocalBgpAsnExtended?: Value<number>;
  LocalBgpAsn?: Value<number>;
  Tags?: List<ResourceTag>;
}
export default class LocalGatewayVirtualInterfaceGroup extends ResourceBase<LocalGatewayVirtualInterfaceGroupProperties> {
  constructor(properties: LocalGatewayVirtualInterfaceGroupProperties) {
    super('AWS::EC2::LocalGatewayVirtualInterfaceGroup', properties);
  }
}
