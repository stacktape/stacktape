import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BlockPublicAccessStates {
  InternetGatewayBlockMode?: Value<string>;
  constructor(properties: BlockPublicAccessStates) {
    Object.assign(this, properties);
  }
}

export class PrivateDnsNameOptionsOnLaunch {
  EnableResourceNameDnsARecord?: Value<boolean>;
  HostnameType?: Value<string>;
  EnableResourceNameDnsAAAARecord?: Value<boolean>;
  constructor(properties: PrivateDnsNameOptionsOnLaunch) {
    Object.assign(this, properties);
  }
}
export interface SubnetProperties {
  MapPublicIpOnLaunch?: Value<boolean>;
  EnableDns64?: Value<boolean>;
  AvailabilityZoneId?: Value<string>;
  OutpostArn?: Value<string>;
  AvailabilityZone?: Value<string>;
  CidrBlock?: Value<string>;
  EnableLniAtDeviceIndex?: Value<number>;
  Ipv6NetmaskLength?: Value<number>;
  Ipv6IpamPoolId?: Value<string>;
  AssignIpv6AddressOnCreation?: Value<boolean>;
  VpcId: Value<string>;
  Ipv4NetmaskLength?: Value<number>;
  PrivateDnsNameOptionsOnLaunch?: PrivateDnsNameOptionsOnLaunch;
  Ipv4IpamPoolId?: Value<string>;
  Ipv6Native?: Value<boolean>;
  Ipv6CidrBlock?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Subnet extends ResourceBase<SubnetProperties> {
  static BlockPublicAccessStates = BlockPublicAccessStates;
  static PrivateDnsNameOptionsOnLaunch = PrivateDnsNameOptionsOnLaunch;
  constructor(properties: SubnetProperties) {
    super('AWS::EC2::Subnet', properties);
  }
}
