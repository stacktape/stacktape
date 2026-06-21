import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface OdbPeeringConnectionProperties {
  AdditionalPeerNetworkCidrs?: List<Value<string>>;
  PeerNetworkRouteTableIds?: List<Value<string>>;
  OdbNetworkId?: Value<string>;
  DisplayName?: Value<string>;
  PeerNetworkId?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class OdbPeeringConnection extends ResourceBase<OdbPeeringConnectionProperties> {
  constructor(properties?: OdbPeeringConnectionProperties) {
    super('AWS::ODB::OdbPeeringConnection', properties || {});
  }
}
