import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface VPNConnectionRouteProperties {
  DestinationCidrBlock: Value<string>;
  VpnConnectionId: Value<string>;
}
export default class VPNConnectionRoute extends ResourceBase<VPNConnectionRouteProperties> {
  constructor(properties: VPNConnectionRouteProperties) {
    super('AWS::EC2::VPNConnectionRoute', properties);
  }
}
