import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BgpOptions {
  PeerLivenessDetection?: Value<string>;
  PeerAsn?: Value<number>;
  constructor(properties: BgpOptions) {
    Object.assign(this, properties);
  }
}
export interface RouteServerPeerProperties {
  PeerAddress: Value<string>;
  BgpOptions: BgpOptions;
  RouteServerEndpointId: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class RouteServerPeer extends ResourceBase<RouteServerPeerProperties> {
  static BgpOptions = BgpOptions;
  constructor(properties: RouteServerPeerProperties) {
    super('AWS::EC2::RouteServerPeer', properties);
  }
}
