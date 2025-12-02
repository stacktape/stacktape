import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface SecurityGroupEgressProperties {
  CidrIp?: Value<string>;
  CidrIpv6?: Value<string>;
  Description?: Value<string>;
  FromPort?: Value<number>;
  ToPort?: Value<number>;
  IpProtocol: Value<string>;
  DestinationSecurityGroupId?: Value<string>;
  DestinationPrefixListId?: Value<string>;
  GroupId: Value<string>;
}
export default class SecurityGroupEgress extends ResourceBase<SecurityGroupEgressProperties> {
  constructor(properties: SecurityGroupEgressProperties) {
    super('AWS::EC2::SecurityGroupEgress', properties);
  }
}
