import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class SubnetMapping {
  IPAddressType?: Value<string>;
  SubnetId!: Value<string>;
  constructor(properties: SubnetMapping) {
    Object.assign(this, properties);
  }
}
export interface VpcEndpointAssociationProperties {
  SubnetMapping: SubnetMapping;
  Description?: Value<string>;
  VpcId: Value<string>;
  FirewallArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class VpcEndpointAssociation extends ResourceBase<VpcEndpointAssociationProperties> {
  static SubnetMapping = SubnetMapping;
  constructor(properties: VpcEndpointAssociationProperties) {
    super('AWS::NetworkFirewall::VpcEndpointAssociation', properties);
  }
}
