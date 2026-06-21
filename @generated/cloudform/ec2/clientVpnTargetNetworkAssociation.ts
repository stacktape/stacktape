import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ClientVpnTargetNetworkAssociationProperties {
  ClientVpnEndpointId: Value<string>;
  AvailabilityZoneId?: Value<string>;
  AvailabilityZone?: Value<string>;
  SubnetId?: Value<string>;
}
export default class ClientVpnTargetNetworkAssociation extends ResourceBase<ClientVpnTargetNetworkAssociationProperties> {
  constructor(properties: ClientVpnTargetNetworkAssociationProperties) {
    super('AWS::EC2::ClientVpnTargetNetworkAssociation', properties);
  }
}
