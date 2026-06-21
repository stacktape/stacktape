import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface VPNConcentratorProperties {
  TransitGatewayId: Value<string>;
  Type: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class VPNConcentrator extends ResourceBase<VPNConcentratorProperties> {
  constructor(properties: VPNConcentratorProperties) {
    super('AWS::EC2::VPNConcentrator', properties);
  }
}
