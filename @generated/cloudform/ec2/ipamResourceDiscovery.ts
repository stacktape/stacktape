import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IpamOperatingRegion {
  RegionName!: Value<string>;
  constructor(properties: IpamOperatingRegion) {
    Object.assign(this, properties);
  }
}

export class IpamResourceDiscoveryOrganizationalUnitExclusion {
  OrganizationsEntityPath!: Value<string>;
  constructor(properties: IpamResourceDiscoveryOrganizationalUnitExclusion) {
    Object.assign(this, properties);
  }
}
export interface IPAMResourceDiscoveryProperties {
  OrganizationalUnitExclusions?: List<IpamResourceDiscoveryOrganizationalUnitExclusion>;
  Description?: Value<string>;
  Tags?: List<ResourceTag>;
  OperatingRegions?: List<IpamOperatingRegion>;
}
export default class IPAMResourceDiscovery extends ResourceBase<IPAMResourceDiscoveryProperties> {
  static IpamOperatingRegion = IpamOperatingRegion;
  static IpamResourceDiscoveryOrganizationalUnitExclusion = IpamResourceDiscoveryOrganizationalUnitExclusion;
  constructor(properties?: IPAMResourceDiscoveryProperties) {
    super('AWS::EC2::IPAMResourceDiscovery', properties || {});
  }
}
