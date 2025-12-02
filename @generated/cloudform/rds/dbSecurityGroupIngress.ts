import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface DBSecurityGroupIngressProperties {
  CIDRIP?: Value<string>;
  DBSecurityGroupName: Value<string>;
  EC2SecurityGroupId?: Value<string>;
  EC2SecurityGroupName?: Value<string>;
  EC2SecurityGroupOwnerId?: Value<string>;
}
export default class DBSecurityGroupIngress extends ResourceBase<DBSecurityGroupIngressProperties> {
  constructor(properties: DBSecurityGroupIngressProperties) {
    super('AWS::RDS::DBSecurityGroupIngress', properties);
  }
}
