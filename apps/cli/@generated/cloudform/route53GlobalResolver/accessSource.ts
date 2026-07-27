import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface AccessSourceProperties {
  IpAddressType?: Value<string>;
  Cidr: Value<string>;
  DnsViewId: Value<string>;
  Protocol: Value<string>;
  ClientToken?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class AccessSource extends ResourceBase<AccessSourceProperties> {
  constructor(properties: AccessSourceProperties) {
    super('AWS::Route53GlobalResolver::AccessSource', properties);
  }
}
