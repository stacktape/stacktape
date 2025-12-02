import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IpamOperatingRegion {
  RegionName!: Value<string>;
  constructor(properties: IpamOperatingRegion) {
    Object.assign(this, properties);
  }
}

export class IpamOrganizationalUnitExclusion {
  OrganizationsEntityPath!: Value<string>;
  constructor(properties: IpamOrganizationalUnitExclusion) {
    Object.assign(this, properties);
  }
}
export interface IPAMProperties {
  DefaultResourceDiscoveryOrganizationalUnitExclusions?: List<IpamOrganizationalUnitExclusion>;
  Description?: Value<string>;
  MeteredAccount?: Value<string>;
  Tier?: Value<string>;
  EnablePrivateGua?: Value<boolean>;
  Tags?: List<ResourceTag>;
  OperatingRegions?: List<IpamOperatingRegion>;
}
export default class IPAM extends ResourceBase<IPAMProperties> {
  static IpamOperatingRegion = IpamOperatingRegion;
  static IpamOrganizationalUnitExclusion = IpamOrganizationalUnitExclusion;
  constructor(properties?: IPAMProperties) {
    super('AWS::EC2::IPAM', properties || {});
  }
}
