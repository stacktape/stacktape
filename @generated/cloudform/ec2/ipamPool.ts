import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ProvisionedCidr {
  Cidr!: Value<string>;
  constructor(properties: ProvisionedCidr) {
    Object.assign(this, properties);
  }
}

export class SourceResource {
  ResourceRegion!: Value<string>;
  ResourceId!: Value<string>;
  ResourceOwner!: Value<string>;
  ResourceType!: Value<string>;
  constructor(properties: SourceResource) {
    Object.assign(this, properties);
  }
}
export interface IPAMPoolProperties {
  AwsService?: Value<string>;
  Locale?: Value<string>;
  PublicIpSource?: Value<string>;
  Description?: Value<string>;
  SourceResource?: SourceResource;
  SourceIpamPoolId?: Value<string>;
  AllocationMinNetmaskLength?: Value<number>;
  IpamScopeId: Value<string>;
  ProvisionedCidrs?: List<ProvisionedCidr>;
  AllocationMaxNetmaskLength?: Value<number>;
  AllocationDefaultNetmaskLength?: Value<number>;
  AutoImport?: Value<boolean>;
  AddressFamily: Value<string>;
  AllocationResourceTags?: List<ResourceTag>;
  PubliclyAdvertisable?: Value<boolean>;
  Tags?: List<ResourceTag>;
}
export default class IPAMPool extends ResourceBase<IPAMPoolProperties> {
  static ProvisionedCidr = ProvisionedCidr;
  static SourceResource = SourceResource;
  constructor(properties: IPAMPoolProperties) {
    super('AWS::EC2::IPAMPool', properties);
  }
}
