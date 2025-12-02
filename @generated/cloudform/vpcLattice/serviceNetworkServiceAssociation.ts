import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DnsEntry {
  DomainName?: Value<string>;
  HostedZoneId?: Value<string>;
  constructor(properties: DnsEntry) {
    Object.assign(this, properties);
  }
}
export interface ServiceNetworkServiceAssociationProperties {
  ServiceNetworkIdentifier?: Value<string>;
  DnsEntry?: DnsEntry;
  ServiceIdentifier?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class ServiceNetworkServiceAssociation extends ResourceBase<ServiceNetworkServiceAssociationProperties> {
  static DnsEntry = DnsEntry;
  constructor(properties?: ServiceNetworkServiceAssociationProperties) {
    super('AWS::VpcLattice::ServiceNetworkServiceAssociation', properties || {});
  }
}
