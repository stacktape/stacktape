import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface SubnetRouteTableAssociationProperties {
  RouteTableId: Value<string>;
  SubnetId: Value<string>;
}
export default class SubnetRouteTableAssociation extends ResourceBase<SubnetRouteTableAssociationProperties> {
  constructor(properties: SubnetRouteTableAssociationProperties) {
    super('AWS::EC2::SubnetRouteTableAssociation', properties);
  }
}
