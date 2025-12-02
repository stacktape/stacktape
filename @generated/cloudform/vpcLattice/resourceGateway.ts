import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface ResourceGatewayProperties {
  IpAddressType?: Value<string>;
  VpcIdentifier: Value<string>;
  Ipv4AddressesPerEni?: Value<number>;
  SubnetIds: List<Value<string>>;
  SecurityGroupIds?: List<Value<string>>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class ResourceGateway extends ResourceBase<ResourceGatewayProperties> {
  constructor(properties: ResourceGatewayProperties) {
    super('AWS::VpcLattice::ResourceGateway', properties);
  }
}
