import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class TargetAddress {
  Ipv6?: Value<string>;
  Ip?: Value<string>;
  Port?: Value<string>;
  Protocol?: Value<string>;
  ServerNameIndication?: Value<string>;
  constructor(properties: TargetAddress) {
    Object.assign(this, properties);
  }
}
export interface ResolverRuleProperties {
  ResolverEndpointId?: Value<string>;
  DomainName?: Value<string>;
  RuleType: Value<string>;
  DelegationRecord?: Value<string>;
  Tags?: List<ResourceTag>;
  TargetIps?: List<TargetAddress>;
  Name?: Value<string>;
}
export default class ResolverRule extends ResourceBase<ResolverRuleProperties> {
  static TargetAddress = TargetAddress;
  constructor(properties: ResolverRuleProperties) {
    super('AWS::Route53Resolver::ResolverRule', properties);
  }
}
