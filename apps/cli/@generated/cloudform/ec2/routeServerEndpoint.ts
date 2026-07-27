import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface RouteServerEndpointProperties {
  SubnetId: Value<string>;
  RouteServerId: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class RouteServerEndpoint extends ResourceBase<RouteServerEndpointProperties> {
  constructor(properties: RouteServerEndpointProperties) {
    super('AWS::EC2::RouteServerEndpoint', properties);
  }
}
