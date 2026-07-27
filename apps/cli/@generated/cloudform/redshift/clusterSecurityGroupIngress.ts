import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ClusterSecurityGroupIngressProperties {
  CIDRIP?: Value<string>;
  ClusterSecurityGroupName: Value<string>;
  EC2SecurityGroupName?: Value<string>;
  EC2SecurityGroupOwnerId?: Value<string>;
}
export default class ClusterSecurityGroupIngress extends ResourceBase<ClusterSecurityGroupIngressProperties> {
  constructor(properties: ClusterSecurityGroupIngressProperties) {
    super('AWS::Redshift::ClusterSecurityGroupIngress', properties);
  }
}
