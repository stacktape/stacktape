import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface RouteServerProperties {
  PersistRoutes?: Value<string>;
  SnsNotificationsEnabled?: Value<boolean>;
  PersistRoutesDuration?: Value<number>;
  AmazonSideAsn: Value<number>;
  Tags?: List<ResourceTag>;
}
export default class RouteServer extends ResourceBase<RouteServerProperties> {
  constructor(properties: RouteServerProperties) {
    super('AWS::EC2::RouteServer', properties);
  }
}
