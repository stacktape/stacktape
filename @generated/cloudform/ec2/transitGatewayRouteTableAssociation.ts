import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface TransitGatewayRouteTableAssociationProperties {
  TransitGatewayRouteTableId: Value<string>;
  TransitGatewayAttachmentId: Value<string>;
}
export default class TransitGatewayRouteTableAssociation extends ResourceBase<TransitGatewayRouteTableAssociationProperties> {
  constructor(properties: TransitGatewayRouteTableAssociationProperties) {
    super('AWS::EC2::TransitGatewayRouteTableAssociation', properties);
  }
}
