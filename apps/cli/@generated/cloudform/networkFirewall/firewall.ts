import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AvailabilityZoneMapping {
  AvailabilityZone!: Value<string>;
  constructor(properties: AvailabilityZoneMapping) {
    Object.assign(this, properties);
  }
}

export class SubnetMapping {
  IPAddressType?: Value<string>;
  SubnetId!: Value<string>;
  constructor(properties: SubnetMapping) {
    Object.assign(this, properties);
  }
}
export interface FirewallProperties {
  FirewallPolicyArn: Value<string>;
  Description?: Value<string>;
  SubnetChangeProtection?: Value<boolean>;
  TransitGatewayId?: Value<string>;
  AvailabilityZoneChangeProtection?: Value<boolean>;
  FirewallName: Value<string>;
  VpcId?: Value<string>;
  DeleteProtection?: Value<boolean>;
  FirewallPolicyChangeProtection?: Value<boolean>;
  AvailabilityZoneMappings?: List<AvailabilityZoneMapping>;
  EnabledAnalysisTypes?: List<Value<string>>;
  Tags?: List<ResourceTag>;
  SubnetMappings?: List<SubnetMapping>;
}
export default class Firewall extends ResourceBase<FirewallProperties> {
  static AvailabilityZoneMapping = AvailabilityZoneMapping;
  static SubnetMapping = SubnetMapping;
  constructor(properties: FirewallProperties) {
    super('AWS::NetworkFirewall::Firewall', properties);
  }
}
