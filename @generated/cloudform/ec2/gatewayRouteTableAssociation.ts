import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface GatewayRouteTableAssociationProperties {
  RouteTableId: Value<string>;
  GatewayId: Value<string>;
}
export default class GatewayRouteTableAssociation extends ResourceBase<GatewayRouteTableAssociationProperties> {
  constructor(properties: GatewayRouteTableAssociationProperties) {
    super('AWS::EC2::GatewayRouteTableAssociation', properties);
  }
}
