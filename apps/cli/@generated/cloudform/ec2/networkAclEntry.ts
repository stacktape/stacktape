import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Icmp {
  Type?: Value<number>;
  Code?: Value<number>;
  constructor(properties: Icmp) {
    Object.assign(this, properties);
  }
}

export class PortRange {
  From?: Value<number>;
  To?: Value<number>;
  constructor(properties: PortRange) {
    Object.assign(this, properties);
  }
}
export interface NetworkAclEntryProperties {
  PortRange?: PortRange;
  NetworkAclId: Value<string>;
  RuleAction: Value<string>;
  CidrBlock?: Value<string>;
  Egress?: Value<boolean>;
  RuleNumber: Value<number>;
  Ipv6CidrBlock?: Value<string>;
  Protocol: Value<number>;
  Icmp?: Icmp;
}
export default class NetworkAclEntry extends ResourceBase<NetworkAclEntryProperties> {
  static Icmp = Icmp;
  static PortRange = PortRange;
  constructor(properties: NetworkAclEntryProperties) {
    super('AWS::EC2::NetworkAclEntry', properties);
  }
}
