import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface ConnectionGroupProperties {
  Ipv6Enabled?: Value<boolean>;
  AnycastIpListId?: Value<string>;
  Enabled?: Value<boolean>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class ConnectionGroup extends ResourceBase<ConnectionGroupProperties> {
  constructor(properties: ConnectionGroupProperties) {
    super('AWS::CloudFront::ConnectionGroup', properties);
  }
}
