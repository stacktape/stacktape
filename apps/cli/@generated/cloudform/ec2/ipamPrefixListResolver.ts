import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IpamPrefixListResolverRule {
  IpamScopeId?: Value<string>;
  StaticCidr?: Value<string>;
  RuleType!: Value<string>;
  ResourceType?: Value<string>;
  Conditions?: List<IpamPrefixListResolverRuleCondition>;
  constructor(properties: IpamPrefixListResolverRule) {
    Object.assign(this, properties);
  }
}

export class IpamPrefixListResolverRuleCondition {
  ResourceRegion?: Value<string>;
  ResourceTag?: ResourceTag;
  Cidr?: Value<string>;
  IpamPoolId?: Value<string>;
  ResourceId?: Value<string>;
  ResourceOwner?: Value<string>;
  Operation!: Value<string>;
  constructor(properties: IpamPrefixListResolverRuleCondition) {
    Object.assign(this, properties);
  }
}
export interface IPAMPrefixListResolverProperties {
  Description?: Value<string>;
  IpamId?: Value<string>;
  AddressFamily: Value<string>;
  Rules?: List<IpamPrefixListResolverRule>;
  Tags?: List<ResourceTag>;
}
export default class IPAMPrefixListResolver extends ResourceBase<IPAMPrefixListResolverProperties> {
  static IpamPrefixListResolverRule = IpamPrefixListResolverRule;
  static IpamPrefixListResolverRuleCondition = IpamPrefixListResolverRuleCondition;
  constructor(properties: IPAMPrefixListResolverProperties) {
    super('AWS::EC2::IPAMPrefixListResolver', properties);
  }
}
