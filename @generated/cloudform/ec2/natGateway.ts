import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface NatGatewayProperties {
  SecondaryAllocationIds?: List<Value<string>>;
  PrivateIpAddress?: Value<string>;
  SecondaryPrivateIpAddressCount?: Value<number>;
  ConnectivityType?: Value<string>;
  SecondaryPrivateIpAddresses?: List<Value<string>>;
  VpcId?: Value<string>;
  AllocationId?: Value<string>;
  SubnetId?: Value<string>;
  Tags?: List<ResourceTag>;
  MaxDrainDurationSeconds?: Value<number>;
}
export default class NatGateway extends ResourceBase<NatGatewayProperties> {
  constructor(properties?: NatGatewayProperties) {
    super('AWS::EC2::NatGateway', properties || {});
  }
}
