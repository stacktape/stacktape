import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface CustomerGatewayAssociationProperties {
  GlobalNetworkId: Value<string>;
  DeviceId: Value<string>;
  CustomerGatewayArn: Value<string>;
  LinkId?: Value<string>;
}
export default class CustomerGatewayAssociation extends ResourceBase<CustomerGatewayAssociationProperties> {
  constructor(properties: CustomerGatewayAssociationProperties) {
    super('AWS::NetworkManager::CustomerGatewayAssociation', properties);
  }
}
