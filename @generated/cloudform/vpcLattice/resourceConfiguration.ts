import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DnsResource {
  IpAddressType!: Value<string>;
  DomainName!: Value<string>;
  constructor(properties: DnsResource) {
    Object.assign(this, properties);
  }
}

export class ResourceConfigurationDefinition {
  IpResource?: Value<string>;
  DnsResource?: DnsResource;
  ArnResource?: Value<string>;
  constructor(properties: ResourceConfigurationDefinition) {
    Object.assign(this, properties);
  }
}
export interface ResourceConfigurationProperties {
  AllowAssociationToSharableServiceNetwork?: Value<boolean>;
  ProtocolType?: Value<string>;
  ResourceConfigurationType: Value<string>;
  PortRanges?: List<Value<string>>;
  ResourceConfigurationDefinition?: ResourceConfigurationDefinition;
  ResourceGatewayId?: Value<string>;
  ResourceConfigurationAuthType?: Value<string>;
  ResourceConfigurationGroupId?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class ResourceConfiguration extends ResourceBase<ResourceConfigurationProperties> {
  static DnsResource = DnsResource;
  static ResourceConfigurationDefinition = ResourceConfigurationDefinition;
  constructor(properties: ResourceConfigurationProperties) {
    super('AWS::VpcLattice::ResourceConfiguration', properties);
  }
}
