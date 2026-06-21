import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AvailabilityZoneAddress {
  AvailabilityZoneId?: Value<string>;
  AvailabilityZone?: Value<string>;
  AllocationIds!: List<Value<string>>;
  constructor(properties: AvailabilityZoneAddress) {
    Object.assign(this, properties);
  }
}
export interface NatGatewayProperties {
  SecondaryAllocationIds?: List<Value<string>>;
  PrivateIpAddress?: Value<string>;
  SecondaryPrivateIpAddressCount?: Value<number>;
  ConnectivityType?: Value<string>;
  SecondaryPrivateIpAddresses?: List<Value<string>>;
  VpcId?: Value<string>;
  AvailabilityZoneAddresses?: List<AvailabilityZoneAddress>;
  AvailabilityMode?: Value<string>;
  AllocationId?: Value<string>;
  SubnetId?: Value<string>;
  Tags?: List<ResourceTag>;
  MaxDrainDurationSeconds?: Value<number>;
}
export default class NatGateway extends ResourceBase<NatGatewayProperties> {
  static AvailabilityZoneAddress = AvailabilityZoneAddress;
  constructor(properties?: NatGatewayProperties) {
    super('AWS::EC2::NatGateway', properties || {});
  }
}
