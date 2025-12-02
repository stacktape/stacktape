import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Egress {
  CidrIp?: Value<string>;
  CidrIpv6?: Value<string>;
  Description?: Value<string>;
  FromPort?: Value<number>;
  ToPort?: Value<number>;
  IpProtocol!: Value<string>;
  DestinationSecurityGroupId?: Value<string>;
  DestinationPrefixListId?: Value<string>;
  constructor(properties: Egress) {
    Object.assign(this, properties);
  }
}

export class Ingress {
  CidrIp?: Value<string>;
  CidrIpv6?: Value<string>;
  Description?: Value<string>;
  FromPort?: Value<number>;
  SourceSecurityGroupName?: Value<string>;
  ToPort?: Value<number>;
  SourceSecurityGroupOwnerId?: Value<string>;
  IpProtocol!: Value<string>;
  SourceSecurityGroupId?: Value<string>;
  SourcePrefixListId?: Value<string>;
  constructor(properties: Ingress) {
    Object.assign(this, properties);
  }
}
export interface SecurityGroupProperties {
  GroupDescription: Value<string>;
  GroupName?: Value<string>;
  VpcId?: Value<string>;
  SecurityGroupIngress?: List<Ingress>;
  SecurityGroupEgress?: List<Egress>;
  Tags?: List<ResourceTag>;
}
export default class SecurityGroup extends ResourceBase<SecurityGroupProperties> {
  static Egress = Egress;
  static Ingress = Ingress;
  constructor(properties: SecurityGroupProperties) {
    super('AWS::EC2::SecurityGroup', properties);
  }
}
