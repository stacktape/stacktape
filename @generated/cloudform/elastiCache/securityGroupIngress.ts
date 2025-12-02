import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface SecurityGroupIngressProperties {
  CacheSecurityGroupName: Value<string>;
  EC2SecurityGroupName: Value<string>;
  EC2SecurityGroupOwnerId?: Value<string>;
}
export default class SecurityGroupIngress extends ResourceBase<SecurityGroupIngressProperties> {
  constructor(properties: SecurityGroupIngressProperties) {
    super('AWS::ElastiCache::SecurityGroupIngress', properties);
  }
}
