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
  CustomDomainName?: Value<string>;
  PortRanges?: List<Value<string>>;
  ResourceConfigurationDefinition?: ResourceConfigurationDefinition;
  GroupDomain?: Value<string>;
  ResourceConfigurationAuthType?: Value<string>;
  ResourceConfigurationGroupId?: Value<string>;
  Name: Value<string>;
  AllowAssociationToSharableServiceNetwork?: Value<boolean>;
  ProtocolType?: Value<string>;
  ResourceConfigurationType: Value<string>;
  DomainVerificationId?: Value<string>;
  ResourceGatewayId?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class ResourceConfiguration extends ResourceBase<ResourceConfigurationProperties> {
  static DnsResource = DnsResource;
  static ResourceConfigurationDefinition = ResourceConfigurationDefinition;
  constructor(properties: ResourceConfigurationProperties) {
    super('AWS::VpcLattice::ResourceConfiguration', properties);
  }
}
