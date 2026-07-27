import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IEMap {
  ACCOUNT?: List<Value<string>>;
  ORGUNIT?: List<Value<string>>;
  constructor(properties: IEMap) {
    Object.assign(this, properties);
  }
}

export class IcmpTypeCode {
  Type!: Value<number>;
  Code!: Value<number>;
  constructor(properties: IcmpTypeCode) {
    Object.assign(this, properties);
  }
}

export class NetworkAclCommonPolicy {
  NetworkAclEntrySet!: NetworkAclEntrySet;
  constructor(properties: NetworkAclCommonPolicy) {
    Object.assign(this, properties);
  }
}

export class NetworkAclEntry {
  PortRange?: PortRange;
  IcmpTypeCode?: IcmpTypeCode;
  RuleAction!: Value<string>;
  CidrBlock?: Value<string>;
  Egress!: Value<boolean>;
  Ipv6CidrBlock?: Value<string>;
  Protocol!: Value<string>;
  constructor(properties: NetworkAclEntry) {
    Object.assign(this, properties);
  }
}

export class NetworkAclEntrySet {
  LastEntries?: List<NetworkAclEntry>;
  ForceRemediateForFirstEntries!: Value<boolean>;
  FirstEntries?: List<NetworkAclEntry>;
  ForceRemediateForLastEntries!: Value<boolean>;
  constructor(properties: NetworkAclEntrySet) {
    Object.assign(this, properties);
  }
}

export class NetworkFirewallPolicy {
  FirewallDeploymentModel!: Value<string>;
  constructor(properties: NetworkFirewallPolicy) {
    Object.assign(this, properties);
  }
}

export class PolicyOption {
  NetworkFirewallPolicy?: NetworkFirewallPolicy;
  NetworkAclCommonPolicy?: NetworkAclCommonPolicy;
  ThirdPartyFirewallPolicy?: ThirdPartyFirewallPolicy;
  constructor(properties: PolicyOption) {
    Object.assign(this, properties);
  }
}

export class PolicyTag {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: PolicyTag) {
    Object.assign(this, properties);
  }
}

export class PortRange {
  From!: Value<number>;
  To!: Value<number>;
  constructor(properties: PortRange) {
    Object.assign(this, properties);
  }
}

export class ResourceTag {
  Value?: Value<string>;
  Key!: Value<string>;
  constructor(properties: ResourceTag) {
    Object.assign(this, properties);
  }
}

export class SecurityServicePolicyData {
  ManagedServiceData?: Value<string>;
  Type!: Value<string>;
  PolicyOption?: PolicyOption;
  constructor(properties: SecurityServicePolicyData) {
    Object.assign(this, properties);
  }
}

export class ThirdPartyFirewallPolicy {
  FirewallDeploymentModel!: Value<string>;
  constructor(properties: ThirdPartyFirewallPolicy) {
    Object.assign(this, properties);
  }
}
export interface PolicyProperties {
  ResourceTagLogicalOperator?: Value<string>;
  ResourcesCleanUp?: Value<boolean>;
  ResourceTags?: List<ResourceTag>;
  ExcludeResourceTags: Value<boolean>;
  ResourceType?: Value<string>;
  ResourceSetIds?: List<Value<string>>;
  SecurityServicePolicyData: SecurityServicePolicyData;
  RemediationEnabled: Value<boolean>;
  DeleteAllPolicyResources?: Value<boolean>;
  ExcludeMap?: IEMap;
  IncludeMap?: IEMap;
  PolicyDescription?: Value<string>;
  PolicyName: Value<string>;
  ResourceTypeList?: List<Value<string>>;
  Tags?: List<PolicyTag>;
}
export default class Policy extends ResourceBase<PolicyProperties> {
  static IEMap = IEMap;
  static IcmpTypeCode = IcmpTypeCode;
  static NetworkAclCommonPolicy = NetworkAclCommonPolicy;
  static NetworkAclEntry = NetworkAclEntry;
  static NetworkAclEntrySet = NetworkAclEntrySet;
  static NetworkFirewallPolicy = NetworkFirewallPolicy;
  static PolicyOption = PolicyOption;
  static PolicyTag = PolicyTag;
  static PortRange = PortRange;
  static ResourceTag = ResourceTag;
  static SecurityServicePolicyData = SecurityServicePolicyData;
  static ThirdPartyFirewallPolicy = ThirdPartyFirewallPolicy;
  constructor(properties: PolicyProperties) {
    super('AWS::FMS::Policy', properties);
  }
}
