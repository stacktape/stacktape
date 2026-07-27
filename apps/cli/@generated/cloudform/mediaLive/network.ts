import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IpPool {
  Cidr?: Value<string>;
  constructor(properties: IpPool) {
    Object.assign(this, properties);
  }
}

export class Route {
  Cidr?: Value<string>;
  Gateway?: Value<string>;
  constructor(properties: Route) {
    Object.assign(this, properties);
  }
}

export class Tags {
  Value?: Value<string>;
  Key?: Value<string>;
  constructor(properties: Tags) {
    Object.assign(this, properties);
  }
}
export interface NetworkProperties {
  IpPools: List<IpPool>;
  Routes?: List<Route>;
  Tags?: List<Tags>;
  Name: Value<string>;
}
export default class Network extends ResourceBase<NetworkProperties> {
  static IpPool = IpPool;
  static Route = Route;
  static Tags = Tags;
  constructor(properties: NetworkProperties) {
    super('AWS::MediaLive::Network', properties);
  }
}
