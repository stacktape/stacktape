import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface RouteServerAssociationProperties {
  VpcId: Value<string>;
  RouteServerId: Value<string>;
}
export default class RouteServerAssociation extends ResourceBase<RouteServerAssociationProperties> {
  constructor(properties: RouteServerAssociationProperties) {
    super('AWS::EC2::RouteServerAssociation', properties);
  }
}
