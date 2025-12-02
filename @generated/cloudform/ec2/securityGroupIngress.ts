import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface SecurityGroupIngressProperties {
  GroupName?: Value<string>;
  CidrIp?: Value<string>;
  CidrIpv6?: Value<string>;
  Description?: Value<string>;
  FromPort?: Value<number>;
  SourceSecurityGroupName?: Value<string>;
  ToPort?: Value<number>;
  SourceSecurityGroupOwnerId?: Value<string>;
  IpProtocol: Value<string>;
  SourceSecurityGroupId?: Value<string>;
  SourcePrefixListId?: Value<string>;
  GroupId?: Value<string>;
}
export default class SecurityGroupIngress extends ResourceBase<SecurityGroupIngressProperties> {
  constructor(properties: SecurityGroupIngressProperties) {
    super('AWS::EC2::SecurityGroupIngress', properties);
  }
}
