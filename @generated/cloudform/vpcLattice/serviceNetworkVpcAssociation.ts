import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DnsOptions {
  PrivateDnsSpecifiedDomains?: List<Value<string>>;
  PrivateDnsPreference?: Value<string>;
  constructor(properties: DnsOptions) {
    Object.assign(this, properties);
  }
}
export interface ServiceNetworkVpcAssociationProperties {
  PrivateDnsEnabled?: Value<boolean>;
  ServiceNetworkIdentifier?: Value<string>;
  DnsOptions?: DnsOptions;
  VpcIdentifier?: Value<string>;
  SecurityGroupIds?: List<Value<string>>;
  Tags?: List<ResourceTag>;
}
export default class ServiceNetworkVpcAssociation extends ResourceBase<ServiceNetworkVpcAssociationProperties> {
  static DnsOptions = DnsOptions;
  constructor(properties?: ServiceNetworkVpcAssociationProperties) {
    super('AWS::VpcLattice::ServiceNetworkVpcAssociation', properties || {});
  }
}
