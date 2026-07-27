import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DnsEntry {
  DomainName?: Value<string>;
  HostedZoneId?: Value<string>;
  constructor(properties: DnsEntry) {
    Object.assign(this, properties);
  }
}
export interface ServiceProperties {
  DnsEntry?: DnsEntry;
  CustomDomainName?: Value<string>;
  AuthType?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
  CertificateArn?: Value<string>;
}
export default class Service extends ResourceBase<ServiceProperties> {
  static DnsEntry = DnsEntry;
  constructor(properties?: ServiceProperties) {
    super('AWS::VpcLattice::Service', properties || {});
  }
}
