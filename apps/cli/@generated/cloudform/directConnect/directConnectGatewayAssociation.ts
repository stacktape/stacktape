import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface DirectConnectGatewayAssociationProperties {
  AcceptDirectConnectGatewayAssociationProposalRoleArn?: Value<string>;
  DirectConnectGatewayId: Value<string>;
  AssociatedGatewayId: Value<string>;
  AllowedPrefixesToDirectConnectGateway?: List<Value<string>>;
}
export default class DirectConnectGatewayAssociation extends ResourceBase<DirectConnectGatewayAssociationProperties> {
  constructor(properties: DirectConnectGatewayAssociationProperties) {
    super('AWS::DirectConnect::DirectConnectGatewayAssociation', properties);
  }
}
