import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class TagFormat {
  Value?: Value<string>;
  Key?: Value<string>;
  constructor(properties: TagFormat) {
    Object.assign(this, properties);
  }
}
export interface DBProxyEndpointProperties {
  DBProxyEndpointName: Value<string>;
  DBProxyName: Value<string>;
  TargetRole?: Value<string>;
  VpcSecurityGroupIds?: List<Value<string>>;
  VpcSubnetIds: List<Value<string>>;
  Tags?: List<TagFormat>;
  EndpointNetworkType?: Value<string>;
}
export default class DBProxyEndpoint extends ResourceBase<DBProxyEndpointProperties> {
  static TagFormat = TagFormat;
  constructor(properties: DBProxyEndpointProperties) {
    super('AWS::RDS::DBProxyEndpoint', properties);
  }
}
