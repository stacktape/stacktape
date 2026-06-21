import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface DnsViewProperties {
  EdnsClientSubnet?: Value<string>;
  FirewallRulesFailOpen?: Value<string>;
  Description?: Value<string>;
  DnssecValidation?: Value<string>;
  GlobalResolverId: Value<string>;
  ClientToken?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class DnsView extends ResourceBase<DnsViewProperties> {
  constructor(properties: DnsViewProperties) {
    super('AWS::Route53GlobalResolver::DnsView', properties);
  }
}
