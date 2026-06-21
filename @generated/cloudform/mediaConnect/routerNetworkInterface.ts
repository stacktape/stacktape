import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class PublicRouterNetworkInterfaceConfiguration {
  AllowRules!: List<PublicRouterNetworkInterfaceRule>;
  constructor(properties: PublicRouterNetworkInterfaceConfiguration) {
    Object.assign(this, properties);
  }
}

export class PublicRouterNetworkInterfaceRule {
  Cidr!: Value<string>;
  constructor(properties: PublicRouterNetworkInterfaceRule) {
    Object.assign(this, properties);
  }
}

export class RouterNetworkInterfaceConfiguration {
  Vpc?: VpcRouterNetworkInterfaceConfiguration;
  Public?: PublicRouterNetworkInterfaceConfiguration;
  constructor(properties: RouterNetworkInterfaceConfiguration) {
    Object.assign(this, properties);
  }
}

export class VpcRouterNetworkInterfaceConfiguration {
  SubnetId!: Value<string>;
  SecurityGroupIds!: List<Value<string>>;
  constructor(properties: VpcRouterNetworkInterfaceConfiguration) {
    Object.assign(this, properties);
  }
}
export interface RouterNetworkInterfaceProperties {
  Configuration: RouterNetworkInterfaceConfiguration;
  RegionName?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class RouterNetworkInterface extends ResourceBase<RouterNetworkInterfaceProperties> {
  static PublicRouterNetworkInterfaceConfiguration = PublicRouterNetworkInterfaceConfiguration;
  static PublicRouterNetworkInterfaceRule = PublicRouterNetworkInterfaceRule;
  static RouterNetworkInterfaceConfiguration = RouterNetworkInterfaceConfiguration;
  static VpcRouterNetworkInterfaceConfiguration = VpcRouterNetworkInterfaceConfiguration;
  constructor(properties: RouterNetworkInterfaceProperties) {
    super('AWS::MediaConnect::RouterNetworkInterface', properties);
  }
}
