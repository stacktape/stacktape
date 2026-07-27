import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class LoadBalancerAttribute {
  Value?: Value<string>;
  Key?: Value<string>;
  constructor(properties: LoadBalancerAttribute) {
    Object.assign(this, properties);
  }
}

export class MinimumLoadBalancerCapacity {
  CapacityUnits!: Value<number>;
  constructor(properties: MinimumLoadBalancerCapacity) {
    Object.assign(this, properties);
  }
}

export class SubnetMapping {
  AllocationId?: Value<string>;
  IPv6Address?: Value<string>;
  SubnetId!: Value<string>;
  SourceNatIpv6Prefix?: Value<string>;
  PrivateIPv4Address?: Value<string>;
  constructor(properties: SubnetMapping) {
    Object.assign(this, properties);
  }
}
export interface LoadBalancerProperties {
  IpAddressType?: Value<string>;
  SecurityGroups?: List<Value<string>>;
  LoadBalancerAttributes?: List<LoadBalancerAttribute>;
  Scheme?: Value<string>;
  Name?: Value<string>;
  EnableCapacityReservationProvisionStabilize?: Value<boolean>;
  Subnets?: List<Value<string>>;
  Type?: Value<string>;
  MinimumLoadBalancerCapacity?: MinimumLoadBalancerCapacity;
  EnablePrefixForIpv6SourceNat?: Value<string>;
  Ipv4IpamPoolId?: Value<string>;
  EnforceSecurityGroupInboundRulesOnPrivateLinkTraffic?: Value<string>;
  Tags?: List<ResourceTag>;
  SubnetMappings?: List<SubnetMapping>;
}
export default class LoadBalancer extends ResourceBase<LoadBalancerProperties> {
  static LoadBalancerAttribute = LoadBalancerAttribute;
  static MinimumLoadBalancerCapacity = MinimumLoadBalancerCapacity;
  static SubnetMapping = SubnetMapping;
  constructor(properties?: LoadBalancerProperties) {
    super('AWS::ElasticLoadBalancingV2::LoadBalancer', properties || {});
  }
}
