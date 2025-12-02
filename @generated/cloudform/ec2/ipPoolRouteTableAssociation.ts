import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface IpPoolRouteTableAssociationProperties {
  RouteTableId: Value<string>;
  PublicIpv4Pool: Value<string>;
}
export default class IpPoolRouteTableAssociation extends ResourceBase<IpPoolRouteTableAssociationProperties> {
  constructor(properties: IpPoolRouteTableAssociationProperties) {
    super('AWS::EC2::IpPoolRouteTableAssociation', properties);
  }
}
