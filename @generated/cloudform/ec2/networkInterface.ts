import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ConnectionTrackingSpecification {
  UdpTimeout?: Value<number>;
  TcpEstablishedTimeout?: Value<number>;
  UdpStreamTimeout?: Value<number>;
  constructor(properties: ConnectionTrackingSpecification) {
    Object.assign(this, properties);
  }
}

export class InstanceIpv6Address {
  Ipv6Address!: Value<string>;
  constructor(properties: InstanceIpv6Address) {
    Object.assign(this, properties);
  }
}

export class Ipv4PrefixSpecification {
  Ipv4Prefix!: Value<string>;
  constructor(properties: Ipv4PrefixSpecification) {
    Object.assign(this, properties);
  }
}

export class Ipv6PrefixSpecification {
  Ipv6Prefix!: Value<string>;
  constructor(properties: Ipv6PrefixSpecification) {
    Object.assign(this, properties);
  }
}

export class PrivateIpAddressSpecification {
  PrivateIpAddress!: Value<string>;
  Primary!: Value<boolean>;
  constructor(properties: PrivateIpAddressSpecification) {
    Object.assign(this, properties);
  }
}
export interface NetworkInterfaceProperties {
  Description?: Value<string>;
  PrivateIpAddress?: Value<string>;
  PrivateIpAddresses?: List<PrivateIpAddressSpecification>;
  SecondaryPrivateIpAddressCount?: Value<number>;
  Ipv6PrefixCount?: Value<number>;
  Ipv4Prefixes?: List<Ipv4PrefixSpecification>;
  Ipv4PrefixCount?: Value<number>;
  GroupSet?: List<Value<string>>;
  Ipv6Addresses?: List<InstanceIpv6Address>;
  Ipv6Prefixes?: List<Ipv6PrefixSpecification>;
  SubnetId: Value<string>;
  SourceDestCheck?: Value<boolean>;
  InterfaceType?: Value<string>;
  Ipv6AddressCount?: Value<number>;
  Tags?: List<ResourceTag>;
  ConnectionTrackingSpecification?: ConnectionTrackingSpecification;
}
export default class NetworkInterface extends ResourceBase<NetworkInterfaceProperties> {
  static ConnectionTrackingSpecification = ConnectionTrackingSpecification;
  static InstanceIpv6Address = InstanceIpv6Address;
  static Ipv4PrefixSpecification = Ipv4PrefixSpecification;
  static Ipv6PrefixSpecification = Ipv6PrefixSpecification;
  static PrivateIpAddressSpecification = PrivateIpAddressSpecification;
  constructor(properties: NetworkInterfaceProperties) {
    super('AWS::EC2::NetworkInterface', properties);
  }
}
