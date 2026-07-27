import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface RoutingControlProperties {
  ClusterArn?: Value<string>;
  ControlPanelArn?: Value<string>;
  Name: Value<string>;
}
export default class RoutingControl extends ResourceBase<RoutingControlProperties> {
  constructor(properties: RoutingControlProperties) {
    super('AWS::Route53RecoveryControl::RoutingControl', properties);
  }
}
