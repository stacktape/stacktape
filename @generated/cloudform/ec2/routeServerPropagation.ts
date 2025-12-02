import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface RouteServerPropagationProperties {
  RouteTableId: Value<string>;
  RouteServerId: Value<string>;
}
export default class RouteServerPropagation extends ResourceBase<RouteServerPropagationProperties> {
  constructor(properties: RouteServerPropagationProperties) {
    super('AWS::EC2::RouteServerPropagation', properties);
  }
}
